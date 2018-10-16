import * as assert from 'assert';
import * as path from 'path';

import { findTemplateFiles, getTemplateVariables, TemplateContext } from "../src/template";

suite("findTemplate Tests", function () {
    let fixtureDir = path.join(__dirname,"../../test/fixtures/")
    // Defines a Mocha unit test
    test("Fixture test1", async function() {
        let tmplDir = path.join(fixtureDir,"test1");
        let result = await findTemplateFiles(tmplDir);
        assert.deepEqual(result, [path.join(tmplDir, "test.tmpl")]);
    });
    test("Fixture test2", async function() {
        let tmplDir = path.join(fixtureDir,"test2");
        let result = await findTemplateFiles(tmplDir);
        assert.deepEqual(result, [path.join(tmplDir, "test2.tmpl"), path.join(tmplDir, "asd", "test1.tmpl")]);
    });
});

suite("getTemplateVariables", function () {
    test("get normal variable", function() {
        let text = "asdasd{{var1}}asd";
        let result = getTemplateVariables(text);
        assert.deepEqual(result,new Set(["var1"]));
    });
    test("check ignore escaped variable", function() {
        let text = "asdasd{{{var1}}}\nasd";
        let result = getTemplateVariables(text);
        assert.deepEqual(result,new Set([]));
    });
    test("get normal variable", function() {
        let text = "asdasd{{var1}} \n {{var1}} \n \n{{var2}}asd";
        let result = getTemplateVariables(text);
        assert.deepEqual(result,new Set(["var1", "var2"]));
    });
});

suite("Test TemplateContext", function() {
    let fixtureDir = path.join(__dirname,"../../test/fixtures/")

    test("test fixture test1", async function() {
        let files = await findTemplateFiles(path.join(fixtureDir, "test1"));
        let context = new TemplateContext();
        for(let file of files) {
            await context.addTemplateFile(file);
        }
        assert.deepEqual(context.files, new Map([["vhdl_test", {
            name: "vhdl_test",
            fileName: "test.vhd",
            description: "Test VHDL template"
        }]]));
        assert.deepEqual(context.directories, new Map([["default_vunit", {
            name: "default_vunit",
            description: "Default vunit template",
            structure: {
                src: ["vhdl_test"],
                tests: null
            }
        }]]));
    })
})