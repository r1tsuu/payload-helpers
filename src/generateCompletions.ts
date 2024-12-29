import fs from 'fs'
import path from 'path'
import ts from 'typescript'
import * as vscode from 'vscode'

export const generateCompletions = (
  input: string,
  importMapBaseDir: string,
  tsConfigDir: string,
  tsConfigPaths: Record<string, string[]>,
): vscode.CompletionItem[] => {
  let searchPath = importMapBaseDir

  let foundFromTsConfig = false
  for (const tsconfigPath in tsConfigPaths) {
    if (input.startsWith(tsconfigPath.replaceAll('*', ''))) {
      searchPath = path.resolve(tsConfigDir, tsConfigPaths[tsconfigPath][0].replaceAll('*', ''))
      input = input.replace(tsconfigPath.replaceAll('*', ''), '')
      foundFromTsConfig = true
      break
    }
  }

  const moduleSpecificTrigger = input.includes('#')

  console.log(moduleSpecificTrigger)

  if (input) {
    if (input.startsWith('/') && !foundFromTsConfig) {
      input = input.replace('/', '')
    }

    if (moduleSpecificTrigger) {
      input = input.split('#')[0]
    }

    searchPath = path.resolve(searchPath, input)
  }

  const completions: vscode.CompletionItem[] = []

  if (!moduleSpecificTrigger) {
    const dir = fs.readdirSync(searchPath)

    dir.sort((a, b) => {
      return a.localeCompare(b)
    })

    for (const file of dir) {
      const isDirectory = fs.statSync(path.resolve(searchPath, file)).isDirectory()

      if (isDirectory) {
        completions.push(new vscode.CompletionItem(file, vscode.CompletionItemKind.Folder))
      } else {
        if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.d.ts')) {
          completions.push(new vscode.CompletionItem(file, vscode.CompletionItemKind.File))
        }
      }
    }
  } else {
    if (fs.existsSync(searchPath)) {
      const file = fs.readFileSync(searchPath, 'utf-8')

      const sourceFile = ts.createSourceFile(searchPath, file, ts.ScriptTarget.Latest, true)

      const visit = (node: ts.Node) => {
        if (ts.isVariableStatement(node)) {
          if (node.modifiers?.[0].kind === ts.SyntaxKind.ExportKeyword) {
            completions.push(
              new vscode.CompletionItem(
                node.declarationList.declarations[0].name.getText(),
                vscode.CompletionItemKind.Variable,
              ),
            )
          }

          return
        }
      }

      ts.forEachChild(sourceFile, visit)
    }
  }

  return completions
}
