import type * as vscode from 'vscode'

import path from 'path'
import ts from 'typescript'

import { generateCompletions } from './generateCompletions'
import { getImportMapBaseDir } from './getImportMapBaseDir'

export class PayloadComponentPathsCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
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

    if (!payloadConfigPath) {
      return null
    }

    const importMapBaseDir = getImportMapBaseDir(payloadConfigPath)

    const visitNode = (
      node: ts.Node,
      context: {
        inside?: 'admin' | 'components' | 'Field'
      } = {},
    ) => {
      if (ts.isPropertyAssignment(node)) {
        if (node.name.getText() === 'admin') {
          ts.forEachChild(node.initializer, (node) => visitNode(node, { inside: 'admin' }))

          return
        }

        if (node.name.getText() === 'components' && context.inside === 'admin') {
          ts.forEachChild(node.initializer, (node) => visitNode(node, { inside: 'components' }))
          return
        }
      }

      if (ts.isStringLiteral(node) && context.inside === 'components') {
        console.log('node')
        if (positionOffset >= node.getStart() && positionOffset <= node.getEnd()) {
          const completions = generateCompletions(
            node.text,
            importMapBaseDir,
            path.dirname(tsconfigPath),
            paths ?? {},
          )

          for (let i = 0; i < completions.length; i++) {
            const completion = completions[i]
            suggestions.push(completion)
          }
          return
        }
      }

      ts.forEachChild(node, (child) => visitNode(child, context))

      // if (ts.isCallExpression(node) && node.expression.getText() === 'componentPath') {
      //   const args = node.arguments

      //   const firstArg = args[0]

      //   if (!firstArg) {
      //     return
      //   }

      //   if (ts.isStringLiteral(firstArg)) {
      //     const firstArgStart = firstArg.getStart()
      //     const firstArgEnd = firstArg.getEnd()

      //     if (positionOffset >= firstArgStart && positionOffset <= firstArgEnd) {
      //       const completions = generateCompletions(
      //         firstArg.text,
      //         importMapBaseDir,
      //         path.dirname(tsconfigPath),
      //         paths ?? {},
      //       )

      //       for (let i = 0; i < completions.length; i++) {
      //         const completion = completions[i]
      //         suggestions.push(completion)
      //       }

      //       return
      //     }
      //   }
      // }
    }

    visitNode(sourceCode)

    return suggestions
  }
}
