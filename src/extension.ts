'use strict';
import * as vscode from 'vscode';
import { PickTemplateFile } from './pickTemplate'
import { TemplateContext, findTemplateFiles } from './template';

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('extension.createTemplate', async () => {
        if (vscode.workspace.workspaceFolders === undefined) {
            return;
        }
        let files = await findTemplateFiles(vscode.workspace.workspaceFolders[0].uri.fsPath+"/.tmp/");
        let templateContext = new TemplateContext();
        for(let file of files) {
            await templateContext.addTemplateFile(file);
        }
        await PickTemplateFile.run(templateContext);
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}