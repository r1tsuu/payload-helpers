import * as path from 'path'
import ts from 'typescript'

import { findUp } from './findUp'

export const getImportMapBaseDir = (payloadConfigPath: string) => {
  const payloadConfigSourceCode = ts.createSourceFile(
    payloadConfigPath,
    ts.sys.readFile(payloadConfigPath) || '',
    ts.ScriptTarget.Latest,
    true,
  )

  let baseDir: null | string = null

  const visit = (
    node: ts.Node,
    context: {
      insideOfImportMap?: boolean
    } = {},
  ) => {
    if (ts.isPropertyAssignment(node)) {
      if (context.insideOfImportMap && node.name.getText() === 'baseDir') {
        const dirnameValue = node.getText().split(':')[1].trim()

        /**
         * This is a hack to get the base directory of the import map.
         * We can't execute typescript file in the same context as the extension.
         */
        const getBaseDir = eval(`() => {
          const path = require('path')

          const filename = "${payloadConfigPath}"
          const dirname = "${path.dirname(payloadConfigPath)}"
          
          return ${dirnameValue}
          
          }`)

        baseDir = getBaseDir()

        return
      }

      if (node.name.getText() === 'importMap') {
        context.insideOfImportMap = true
      }
    }

    ts.forEachChild(node, (child) => visit(child, context))
  }

  visit(payloadConfigSourceCode)

  // If there wasn't a baseDir property in the import map, we'll try to find a package.json file in the same directory as the import map.
  if (!baseDir) {
    const packageJSONPath = findUp({
      dir: path.dirname(payloadConfigPath),
      fileNames: ['package.json'],
    })

    if (packageJSONPath) {
      baseDir = path.dirname(packageJSONPath)
    }
  }

  return baseDir!
}
