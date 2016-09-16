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
            parent: null
        };

        return {
            onCodePathStart(codePath, node) {
                contextData = {
                    parent: contextData,
                    node: node,
                    inPromise: contextData.inPromise
                };
                level++;
            },
            onCodePathEnd(codePath, node) {
                level--;
                contextData = contextData.parent;
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
                console.log(`${level}-${conditionLevel} ${contextData.inPromise} FunctionExpression: ${context.getSourceCode().getText(node)}`);
            },
            CallExpression(node) {
                //if(contextData.inPromise) {
                    console.log(`${level}-${conditionLevel} ${contextData.inPromise} CallExpression: ${context.getSourceCode().getText(node)}`);
                //}
            },
            IfStatement(node) {
                conditionLevel++;
                //if (contextData.inPromise) {
                    console.log(`${level}-${conditionLevel} ${contextData.inPromise} IfStatement: ${context.getSourceCode().getText(node)}`);
                //}
            }
        };
    }
};