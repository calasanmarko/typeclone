import ts, { createProgram, forEachChild, formatDiagnostics, isTypeAliasDeclaration, ModuleKind, ModuleResolutionKind, parseConfigFileTextToJson, parseJsonConfigFileContent, ScriptTarget, Symbol, SymbolFlags, SymbolFormatFlags, sys, TypeAliasDeclaration, TypeFormatFlags } from "typescript";
import { readFileSync, writeFileSync } from "fs";

function getGenericsOfTypeDeclaration(node: TypeAliasDeclaration): string {
    if (node.typeParameters) {
        return '<' + node.typeParameters.map(tp => {
            let genericStr = tp.name.text;

            if (tp.constraint) {
                genericStr += ' extends ' + tp.constraint.getText();
            }

            return genericStr;
        }).join(', ') + '>';
    }
    return '';
}

function getCompilerOptionsFromTsConfig(tsconfigPath: string): ts.CompilerOptions {
    const configFileText = readFileSync(tsconfigPath).toString();
    const result = parseConfigFileTextToJson(tsconfigPath, configFileText);
    if (result.error) {
        throw new Error(formatDiagnostics([result.error], {
            getCanonicalFileName: (fileName: string) => fileName,
            getCurrentDirectory: process.cwd,
            getNewLine: () => sys.newLine
        }));
    }
    
    const configObject = result.config;
    const configParseResult = parseJsonConfigFileContent(configObject, ts.sys, process.cwd(), undefined, tsconfigPath);
    if (configParseResult.errors && configParseResult.errors.length > 0) {
        throw new Error(formatDiagnostics(configParseResult.errors, {
            getCanonicalFileName: (fileName: string) => fileName,
            getCurrentDirectory: process.cwd,
            getNewLine: () => sys.newLine
        }));
    }

    return configParseResult.options;
}

function extractTypesFromSourceFile(filePath: string): string[] {
    const program = createProgram([filePath], getCompilerOptionsFromTsConfig('./tsconfig.json'));
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
        throw new Error(`Could not find source file: ${filePath}`);
    }

    const res: string[] = [];

    const processType = (node: TypeAliasDeclaration) => {
        const nodeType = checker.getTypeFromTypeNode(node.type);
        let str = "";
        if (nodeType.isUnionOrIntersection()) {
            str = nodeType.types.map(t => checker.typeToString(t, undefined, TypeFormatFlags.NoTruncation)).join(' | ');
        } else {
            str = checker.typeToString(nodeType, undefined, TypeFormatFlags.NoTruncation);
        }
        res.push(`export type ${node.name.getText()}${getGenericsOfTypeDeclaration(node)} = ${str}`);
    
        return res;
    }

    forEachChild(sourceFile, node => {
        if (isTypeAliasDeclaration(node)) {
            processType(node);
        }
    });

    return res;
}

const filePath = './res/models.ts';
const extractedTypes = extractTypesFromSourceFile(filePath);
const outputFilePath = './out/out.ts';

writeFileSync(outputFilePath, extractedTypes.join('\n'), 'utf8');