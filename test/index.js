import rule from "~/index";
import RuleTester from "eslint/lib/testers/rule-tester";

const ruleTester = new RuleTester();

ruleTester.run("no-unfulfilled-promise", rule, {
    valid: [
        "blah(); new Promise(function(resolve, reject) { if (x) resolve(); if(y) reject(); }); blah();"
    ],
    invalid: [
    ]
});