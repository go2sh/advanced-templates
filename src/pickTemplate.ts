import * as fs from 'fs';
import { window, QuickPickItem } from 'vscode';
import { TemplateContext, TemplateFile, TemplateVariable, getTemplateVariables } from './template'

enum FilePickState {
    PICK_TEMPLATE = 0,
    PICK_FILE = 1,
    PICK_VARIABLES = 2,
    FINISHED
}

class TemplateFileItem implements QuickPickItem {
    templateFile: TemplateFile;
    description?: string;
    label: string;
    picked?: boolean;

    constructor(templateFile: TemplateFile) {
        this.templateFile = templateFile;
        this.description = templateFile.description;
        this.label = templateFile.name;
    }
}

class InputFlowAction {
    private constructor() { }
    static back = new InputFlowAction();
    static cancel = new InputFlowAction();
    static resume = new InputFlowAction();
}

export class PickTemplateFile {

    private state: FilePickState = FilePickState.PICK_TEMPLATE;
    private context: TemplateContext;
    private varCounter: number;

    template?: TemplateFile;
    templateText?: string;
    targetFileName?: string;
    neededVariables?: TemplateVariable[];
    variableValues: Map<string, string>;

    constructor(context: TemplateContext) {
        this.context = context;
        this.variableValues = new Map<string, string>();
        this.varCounter = 0;
    }

    static async run(context: TemplateContext): Promise<PickTemplateFile> {
        const pick = new PickTemplateFile(context);
        await pick.stepThrough();

        return pick;
    }

    private async stepThrough() {
        while (this.state < FilePickState.FINISHED) {
            try {
                switch (this.state) {
                    case FilePickState.PICK_TEMPLATE:
                        this.template = await this.inputTemplate();
                        this.templateText = (await new Promise<string>((resolve, reject) => {
                            fs.readFile(this.template!.fileName, { encoding: "utf-8" }, (err, data) => {
                                if (err) {
                                    reject(err);
                                }
                                resolve(data);
                            });
                        }));
                        this.neededVariables = Array.from((await getTemplateVariables(this.templateText)).values()).map((value) => {
                            let variable = this.context.variables.get(value);
                            if (variable) {
                                return variable;
                            } else {
                                return { name: value, description: value };
                            }
                        });
                        this.state += 1;
                        break;
                    case FilePickState.PICK_FILE:
                        this.targetFileName = await this.inputTargetFilename();
                        this.state += 1;
                        break;
                    case FilePickState.PICK_VARIABLES:
                        let variable = this.neededVariables![this.varCounter];
                        this.variableValues.set(variable.name, await this.inputVariableValue(variable));
                        this.varCounter++;
                        if (this.varCounter === this.neededVariables!.length) {
                            this.state += 1;
                        }
                        break;
                    default:
                        return;
                }
            } catch (err) {
                if (err === InputFlowAction.back) {
                    if (this.state !== FilePickState.PICK_TEMPLATE) {
                        this.state = this.state - 1;
                    }
                }
                if (err === InputFlowAction.cancel) {
                    return;
                }
                if (err === InputFlowAction.resume) {
                    this.state += 1;
                }
            }
        }
    }


    private async inputTemplate(): Promise<TemplateFile> {
        return new Promise<TemplateFile>((resolve, reject) => {
            const input = window.createQuickPick<TemplateFileItem>();
            let accepted: boolean = false;
            input.title = "Select Template";
            input.step = 1;
            input.totalSteps = 2;
            input.placeholder = "";
            input.canSelectMany = false;
            input.items = Array.from(this.context.files.values()).map((value) => {
                return new TemplateFileItem(value);
            });
            input.onDidAccept(() => {
                if (input.selectedItems.length == 1) {
                    accepted = true;
                    input.hide();
                    resolve(input.selectedItems[0].templateFile);
                }
            });
            input.onDidHide(() => {
                if (!accepted) {
                    reject();
                }
            });
            input.show();
        });
    }
    private async inputTargetFilename(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            window.showInputBox({ prompt: "Enter filename" }).then(resolve, reject);
        });
    }
    private async inputVariableValue(variable: TemplateVariable): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            window.showInputBox({ prompt: "Enter Value for " + variable.description + " (" + variable.name + ")" }).then(resolve, reject);
        });
    }
}