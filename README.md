# typeclone
Deeply expands TypeScript types into their own declaration file.

# Installation
Available as a npm package.

For usage from code:
```
npm install --save-dev typeclone
```

For usage from the command line:
```
npm install --global typeclone
```

# Usage
Available both as a command-line utility and a TypeScript module. Gets all types in the input file, expands them, and then outputs them in a separate file. Useful for getting rid of dependencies when exporting inferred types.

For example, take this input file named `demo.ts`
```
import { z } from "zod";

const demoSchema = z.object({
    test: z.string(),
    test2: z.number().nullable().optional(),
});

export type Demo = z.infer<typeof demoSchema>;
```

We can now call either the command-line utility:
```
typeclone demo.ts demo_out.d.ts
```

Or the JavaScript function:
```
import { cloneTypes } from "typeclone";

cloneTypes('demo.ts', 'demo_out.d.ts')
```

Which will result in the output file `demo_out.d.ts` with the following contents:
```
export declare type Demo = { test: string; test2?: number | null | undefined; }
```

Can output both `.ts` and `.d.ts` files, automatically detects which one based on the output file extension.

# License
Made by Marko Calasan, 2023.

This product is licensed under the MIT License.
