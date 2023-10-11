#!/usr/bin/env node
import { cloneTypes } from './index.js';

const args = process.argv.slice(2);

if (args.length !== 2) {
    console.log('Usage: clone-types <inputFile> <outputFile>');
    process.exit(1);
}

const [inputFile, outputFile] = args;
cloneTypes(inputFile, outputFile);

console.log(`Cloned types from ${inputFile} to ${outputFile}`);