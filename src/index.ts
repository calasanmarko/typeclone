import ts from "typescript";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from 'path';

const getGenericsOfTypeDeclaration = (node: ts.TypeAliasDeclaration): string => {
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
};

const findTsConfigPath = (startDir: string): string | null => {
    let currentDir = startDir;

    while (currentDir && currentDir !== '/') {
        const potentialPath = resolve(currentDir, 'tsconfig.json');

        if (ts.sys.fileExists(potentialPath)) {
            return potentialPath;
        }

        currentDir = dirname(currentDir);
    }

    return null;
};

const getCompilerOptionsFromTsConfig = (tsconfigPath: string): ts.CompilerOptions => {
    const configFileText = readFileSync(tsconfigPath).toString();
    const result = ts.parseConfigFileTextToJson(tsconfigPath, configFileText);
    if (result.error) {
        throw new Error(ts.formatDiagnostics([result.error], {
            getCanonicalFileName: (fileName: string) => fileName,
            getCurrentDirectory: process.cwd,
            getNewLine: () => ts.sys.newLine
        }));
    }
    
    const configObject = result.config;
    const configParseResult = ts.parseJsonConfigFileContent(configObject, ts.sys, process.cwd(), undefined, tsconfigPath);
    if (configParseResult.errors && configParseResult.errors.length > 0) {
        throw new Error(ts.formatDiagnostics(configParseResult.errors, {
            getCanonicalFileName: (fileName: string) => fileName,
            getCurrentDirectory: process.cwd,
            getNewLine: () => ts.sys.newLine
        }));
    }

    return configParseResult.options;
};

const extractTypesFromSourceFile = (filePath: string, declarations: boolean): string[] => {
    const program = ts.createProgram([filePath], getCompilerOptionsFromTsConfig(findTsConfigPath(process.cwd()) || './tsconfig.json'));
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
        throw new Error(`Could not find source file: ${filePath}`);
    }

    const res: string[] = [];

    const processType = (node: ts.TypeAliasDeclaration) => {
        const nodeType = checker.getTypeFromTypeNode(node.type);
        let str = "";
        if (nodeType.isUnionOrIntersection()) {
            str = nodeType.types.map(t => checker.typeToString(t, undefined, ts.TypeFormatFlags.NoTruncation)).join(' | ');
        } else {
            str = checker.typeToString(nodeType, undefined, ts.TypeFormatFlags.NoTruncation);
        }
        res.push(`export ${declarations ? 'declare ' : ''}type ${node.name.getText()}${getGenericsOfTypeDeclaration(node)} = ${str}`);
    
        return res;
    }

    ts.forEachChild(sourceFile, node => {
        if (ts.isTypeAliasDeclaration(node)) {
            processType(node);
        }
    });

    return res;
};

export const cloneTypes = (filePath: string, outputFilePath: string) => {
    const extractedTypes = extractTypesFromSourceFile(filePath, outputFilePath.endsWith('.d.ts'));
    writeFileSync(outputFilePath, extractedTypes.join('\n'), 'utf8');
};