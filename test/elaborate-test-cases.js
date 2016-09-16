import fs from "fs";
import path from "path";
import rule from "~/index";
import RuleTester from "eslint/lib/testers/rule-tester";

const ruleTester = new RuleTester();

const readFiles = folder => fs.readdirSync(folder)
    .map(file => path.join(folder, file))
    .map(file => fs.readFileSync(file, "utf8"));

const valid = readFiles(path.join(__dirname, "../test-cases/valid/"));
const invalid = readFiles(path.join(__dirname, "../test-cases/invalid/"));
const error = "All execution path should call either \"resolve(...)\" " +
    "or \"reject(...)\".";

ruleTester.run("no-unfulfilled-promise elaborate test cases", rule, {
    valid,
    invalid: invalid.map(code => {
        return {
            code: code,
            errors: [error]
        };
    })
});