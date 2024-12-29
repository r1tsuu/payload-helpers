import path from 'path'
import ts from 'typescript'
import * as vscode from 'vscode'

import { getImportMapBaseDir } from './getImportMapBaseDir'

export class PayloadComponentPathsCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ) {
    if (document.languageId !== 'typescript') {
      return null
    }

    const positionOffset = document.offsetAt(position)

    const sourceCode = ts.createSourceFile(
      document.fileName,
      document.getText(),
      ts.ScriptTarget.Latest,
      true,
    )

    const suggestions: vscode.CompletionItem[] = []

    const tsconfigPath = ts.findConfigFile(
      document.fileName,
      (fileName) => ts.sys.fileExists(fileName),
      'tsconfig.json',
    )

    if (!tsconfigPath) {
      return null
    }

    const tsconfigFile = ts.readConfigFile(tsconfigPath, (path: string) => ts.sys.readFile(path))

    if (tsconfigFile.error) {
      return null
    }

    const parsedTsconfig = ts.parseJsonConfigFileContent(
      tsconfigFile.config,
      ts.sys,
      path.dirname(tsconfigPath),
    )

    const paths = parsedTsconfig.options.paths

    let payloadConfigPath: null | string = null

    for (const key in paths) {
      if (key === '@payload-config') {
        payloadConfigPath = path.resolve(path.dirname(tsconfigPath), paths[key][0])
      }
    }

    if (payloadConfigPath) {
      getImportMapBaseDir(payloadConfigPath)
    }

    const visitNode = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText() === 'componentPath') {
        const args = node.arguments

        const firstArg = args[0]
        if (!firstArg) {
          return
        }

        if (ts.isStringLiteral(firstArg)) {
          const firstArgStart = firstArg.getStart()
          const firstArgEnd = firstArg.getEnd()

          if (positionOffset >= firstArgStart && positionOffset <= firstArgEnd) {
            suggestions.push(new vscode.CompletionItem('HomePage', vscode.CompletionItemKind.Text))
          }
        }
      }

      ts.forEachChild(node, visitNode)
    }

    visitNode(sourceCode)

    return suggestions
  }
}
