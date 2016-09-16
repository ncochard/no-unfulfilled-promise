import rule from "~/index";
import RuleTester from "eslint/lib/testers/rule-tester";

const ruleTester = new RuleTester();

const error = "All execution path should call either \"resolve(...)\" or \"reject(...)\".";

ruleTester.run("no-unfulfilled-promise", rule, {
    valid: [
        "blah();",
        "function blah() { return Promise.resolve(); }",
        "function blah() { return Promise.reject(); }",
        "new Promise(function(resolve) { resolve(); });",
        "new Promise(function(resolve, reject) { resolve(); });",
        "new Promise(function(resolve, reject) { reject(); });"
    ],
    invalid: [
        {
            code: "new Promise();",
            errors: ["Promise missing handler."]
        },
        {
            code: "new Promise(function(resolve, reject) { if (x) ; });",
            errors: [error]
        },
        {
            code: "blah(); new Promise(function(resolve, reject) { if (x) resolve(); if(y) reject(); }); blah();",
            errors: [error]
        }
    ]
});