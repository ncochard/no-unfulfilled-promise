function push(contextData) {
    const result = Object.assign({}, contextData);
    result.parent = contextData;
    result.isPromiseHandler = false;
    contextData.children = contextData.children || [];
    contextData.children.push(result);
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
        let contextData = {
            inPromise: false,
            parent: null
        };

        return {
            onCodePathStart() {
                contextData = push(contextData);
            },
            onCodePathEnd() {
                contextData = pop(contextData);
            },
            "NewExpression": function(node) {
                const isNewPromise =
                    node.callee &&
                    node.callee.type === "Identifier" &&
                    node.callee.name === "Promise";
                if(isNewPromise) {
                    if(node.arguments.length > 0) {
                        const handler = node.arguments[0];
                        if(handler.type === "FunctionExpression") {
                            contextData.inPromise = true;
                            contextData.isPromiseHandler = true;
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
                if(contextData.parent && contextData.parent.isPromiseHandler) {
                    const unfulfilledChildren = contextData.children.filter(c => !c.promiseFulfilled);
                    contextData.promiseFulfilled = unfulfilledChildren.length === 0;
                    if(!contextData.promiseFulfilled) {
                        error(node, context, contextData);
                    }
                }
            },
            "CallExpression": function(node) {
                if(contextData.inPromise && node.callee) {
                    contextData = push(contextData);
                    if(node.callee.name === contextData.resolveFunction) {
                        contextData.promiseFulfilled = true;
                    } else if(node.callee.name === contextData.rejectFunction) {
                        contextData.promiseFulfilled = true;
                    }
                    contextData = pop(contextData);
                }
            },
            "IfStatement": function(node) {
                if(contextData.inPromise) {
                    contextData = push(contextData);
                }
            },
            "IfStatement:exit": function(node) {
                if(contextData.inPromise) {
                    contextData.children = contextData.children || [];
                    switch(contextData.children.length) {
                        case 2:
                            contextData.promiseFulfilled =
                                contextData.children[0].promiseFulfilled &&
                                contextData.children[1].promiseFulfilled;
                            break;
                        default:
                            contextData.promiseFulfilled = false;
                            break;
                    }
                    contextData = pop(contextData);
                }
            }
        };
    }
};