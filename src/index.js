function push(contextData, node) {
    var result = {
        parent: contextData,
        node: node,
        inPromise: contextData.inPromise,
        deep: contextData.deep,
        promiseFulfilled: contextData.promiseFulfilled,
        resolveFunction: contextData.resolveFunction,
        rejectFunction: contextData.rejectFunction,
        errored: contextData.errored
    };
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
            onCodePathStart(codePath, node) {
                contextData = push(contextData, node);
                level++;
            },
            onCodePathEnd(codePath, node) {
                level--;
                contextData = pop(contextData);
            },
            FunctionExpression(node) {
                const parent = node.parent;
                const parentIsNewPromise =
                    parent.type === "NewExpression" &&
                    parent.callee.type === "Identifier" &&
                    parent.callee.name === "Promise";
                contextData.inPromise = contextData.inPromise || parentIsNewPromise;
                if(node.params.length > 0) {
                    contextData.resolveFunction = node.params[0].name;
                }
                if(node.params.length > 1) {
                    contextData.rejectFunction = node.params[1].name;
                }
                console.log(`${contextData.deep} ${contextData.promiseFulfilled} ${node.type}: ${context.getSourceCode().getText(node)}`);
            },
            "FunctionExpression:exit": function(node) {
                if(contextData.inPromise && !contextData.promiseFulfilled && !contextData.errored) {
                    contextData.errored = true;
                    context.report({
                        node,
                        loc: getLocation(node, context.getSourceCode()).loc.start,
                        message: `All execution path should call either "${contextData.resolveFunction}(...)" or "${contextData.rejectFunction}(...)".`
                    });
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
                contextData = push(contextData, node);
                conditionLevel++;
            },
            "IfStatement:exit": function(node) {
                if(!contextData.promiseFulfilled && !contextData.errored) {
                    contextData.errored = true;
                    context.report({
                        node,
                        loc: getLocation(node, context.getSourceCode()).loc.start,
                        message: `All execution path should call either "${contextData.resolveFunction}(...)" or "${contextData.rejectFunction}(...)".`
                    });
                }
                console.log(`${contextData.deep} ${contextData.promiseFulfilled} ${node.type}: ${context.getSourceCode().getText(node)}`);
                conditionLevel--;
                contextData = pop(contextData);
            }
        };
    }
};