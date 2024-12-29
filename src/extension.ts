import * as vscode from 'vscode'

import { PayloadComponentPathsCompletionProvider } from './PayloadComponentPathsCompletionProvider'

// This method is called when your extension is activated

export function activate(context: vscode.ExtensionContext) {
  vscode.languages.registerCompletionItemProvider(
    'typescript',
    new PayloadComponentPathsCompletionProvider(),
    '/',
    '#',
  )

  // Optionally, you can update the wordPattern to allow `#` as part of the word
  vscode.languages.setLanguageConfiguration('typescript', {
    wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g,
  })
}

export function deactivate() {}
