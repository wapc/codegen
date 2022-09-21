# waPC Code Generators

This library provides the code generators for producing waPC modules using the [Apex language](https://apexlang.io).

## Installation

Make sure you have the Apex CLI installed. Here are [the instructions](https://apexlang.io/docs/getting-started).

From your terminal, run:

```shell
apex install @wapc/codegen
```

Now you should see waPC project templates available.

```shell
apex list templates
```

```
+-----------------------+-------------------------------------+
| NAME                  | DESCRIPTION                         |
+-----------------------+-------------------------------------+
| ...                   | ...                                 |
| @wapc/assemblyscript  | AssemblyScript waPC module project  |
| @wapc/tinygo          | TinyGo waPC module project          |
+-----------------------+-------------------------------------+
```

To create a new TinyGo waPC module, run:

```shell
apex new @wapc/tinygo hello-world
cd hello-world
make
ls -l build
```

```
-rwxr-xr-x  1 uname  staff  18454 Sep 19 14:56 hello-world.wasm
```

If you load the project in VS Code (`code .` from the terminal if VS code is in your path), a task will monitor the Apex interface definition for changes and regenerate boilerplate code.
