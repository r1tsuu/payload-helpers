import * as vscode from 'vscode'

import { PayloadComponentPathsCompletionProvider } from './PayloadComponentPathsCompletionProvider'

// This method is called when your extension is activated

export function activate(_context: vscode.ExtensionContext) {
  vscode.languages.registerCompletionItemProvider(
    'typescript',
    new PayloadComponentPathsCompletionProvider(),
    '/',
  )
}

export function deactivate() {}
