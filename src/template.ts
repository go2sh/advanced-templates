import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import * as yaml from "js-yaml";


const exists = promisify(fs.exists);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);


export interface TemplateVariable {
    name: string;
    description: string;
}

export interface TemplateFile {
    name: string;
    fileName: string;
    description?: string;
    content?: string;
}

export interface TemplateDirectory {
    name: string;
    structure: any;
}

export class TemplateContext {
    variables: Map<string, TemplateVariable>;
    files: Map<string, TemplateFile>;
    directories: Map<string, TemplateDirectory>;

    constructor() {
        this.variables = new Map<string, TemplateVariable>();
        this.files = new Map<string, TemplateFile>();
        this.directories = new Map<string, TemplateDirectory>();
    }

    async addTemplateFile(fileName: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.readFile(fileName, { encoding: "utf-8" }, (err, data) => {
                if (err) {
                    reject(err);
                }
                let tmpl: { variables?: TemplateVariable[]; files?: TemplateFile[]; directories?: TemplateDirectory[]; } = yaml.safeLoad(data);
                if (tmpl.variables) {
                    for (let variable of tmpl.variables) {
                        this.variables.set(variable.name, variable);
                    }
                }
                if (tmpl.files) {
                    for (let file of tmpl.files) {
                        file.fileName = path.join(path.dirname(fileName), file.fileName);
                        this.files.set(file.name, file);
                    }
                }
                if (tmpl.directories) {
                    for (let directory of tmpl.directories) {
                        this.directories.set(directory.name, directory);
                    }
                }
                resolve();
            });
        });

    }
}

export async function findTemplateFiles(templateDir: string): Promise<string[]> {
    let results: string[] = [];
    if (!await exists(templateDir)) {
        return results;
    }
    let dirs = [templateDir]
    while (dirs.length > 0) {
        let dir = dirs.pop();
        // Workaround for ts
        if (dir === undefined) {
            break;
        }

        let files = await readdir(dir);
        for (let file of files) {
            let fileName = path.join(dir, file);
            let st = await stat(fileName);
            if (st.isDirectory()) {
                dirs.push(fileName);
            }
            if (st.isFile() && path.extname(fileName) === ".tmpl") {
                results.push(fileName);
            }
        }
    }
    return results;
}

export function getTemplateVariables(text: string): Set<string> {
    let regex = /(?:^|[^\{])\{{2}\s*(\w+)\s*\}{2}/g;
    let match: RegExpExecArray | null;
    let results: Set<string> = new Set<string>();
    while (match = regex.exec(text)) {
        results.add(match[1])
    }
    return results;
}