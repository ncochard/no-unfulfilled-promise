function push(contextData) {
    const result = Object.assign({}, contextData);
    result.parent = contextData;
    if(result.inPromise) {
        result.deep = contextData.deep + 1;
    }
    return result;
}

function pop(contextData) {
    if(contextData.errored && contextData.parent) {
        contextData.parent.errored = true;
    }
    return contextData.parent;
}

function getLocation(node, sourceCode) {
    if (node.type === "ArrowFunctionExpression") {
        return sourceCode.getTokenBefore(node.body);
    }
    return node.id || node;
}

function error(node, context, contextData, msg) {
    const defaultMessage =
        `All execution path should call either "${contextData.resolveFunction}(...)"` +
        ` or "${contextData.rejectFunction}(...)".`;
    if(contextData.errored) {
        return;
    }
    contextData.errored = true;
    context.report({
        node,
        loc: getLocation(node, context.getSourceCode()).loc.start,
        message: msg || defaultMessage
    });
}

export default {
    meta: {
        docs: {
            description: "ensure that all code paths results in either reject or resolve to be called.",
            category: "Possible Errors",
            recommended: true
        },

        schema: []
    },

    create(context) {
        let level = 0;
        let conditionLevel = 0;
        let contextData = {
            inPromise: false,
            node: null,
            parent: null,
            deep: 0
        };

        return {
            onCodePathStart() {
                contextData = push(contextData);
                level++;
            },
            onCodePathEnd() {
                level--;
                contextData = pop(contextData);
            },
            NewExpression(node) {
                const isNewPromise =
                    node.callee &&
                    node.callee.type === "Identifier" &&
                    node.callee.name === "Promise";
                if(isNewPromise) {
                    if(node.arguments.length > 0) {
                        const handler = node.arguments[0];
                        if(handler.type === "FunctionExpression") {
                            contextData.inPromise = true;
                            if(handler.params.length > 0) {
                                contextData.resolveFunction = handler.params[0].name;
                            }
                            if(handler.params.length > 1) {
                                contextData.rejectFunction = handler.params[1].name;
                            }
                        } else {
                            const msg = `The first argument of the Promise constructor needs to be a function.`;
                            error(node, context, contextData, msg);
                        }
                    } else {
                        const msg = `Promise missing handler.`;
                        error(node, context, contextData, msg);
                    }
                }
            },
            "FunctionExpression:exit": function(node) {
                if(contextData.inPromise && !contextData.promiseFulfilled) {
                    error(node, context, contextData);
                }
            },
            CallExpression(node) {
                if(contextData.inPromise && node.callee) {
                    if(node.callee.name === contextData.resolveFunction) {
                        contextData.promiseFulfilled = true;
                    } else if(node.callee.name === contextData.rejectFunction) {
                        contextData.promiseFulfilled = true;
                    }
                }
                console.log(`${contextData.deep} ${contextData.promiseFulfilled} ${node.type}: ${context.getSourceCode().getText(node)}`);
            },
            IfStatement(node) {
                console.log(`${contextData.deep} ${contextData.promiseFulfilled} ${node.type}: ${context.getSourceCode().getText(node)}`);
                contextData = push(contextData);
                conditionLevel++;
            },
            "IfStatement:exit": function(node) {
                if(!contextData.promiseFulfilled) {
                    error(node, context, contextData);
                }
                console.log(`${contextData.deep} ${contextData.promiseFulfilled} ${node.type}: ${context.getSourceCode().getText(node)}`);
                conditionLevel--;
                contextData = pop(contextData);
            }
        };
    }
};