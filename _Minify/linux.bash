#!/bin/bash

function MinifyJSFiles {
    SourceDirectory="$1"
    OutputDirectory="$2"

    echo "Minimizing JavaScript files in $SourceDirectory and saving to $OutputDirectory"

    if [ ! -d "$SourceDirectory" ]; then
        echo "Source directory does not exist: $SourceDirectory"
        return 1
    fi

    if [ -d "$OutputDirectory" ]; then
        echo "Removing existing output directory: $OutputDirectory"
        rm -rf "$OutputDirectory"
    fi

    mkdir -p "$OutputDirectory"
    echo "Created output directory: $OutputDirectory"

    for file in "$SourceDirectory"/*.js; do
        if [ -e "$file" ]; then
            FileName=$(basename "$file")
            OutputFileName="$OutputDirectory/$FileName"
            echo "Minimizing $file and saving to $OutputFileName"
            npx terser "$file" -o "$OutputFileName" --mangle --ecma 2024 --compress --format quote_style=1 --toplevel --timings --passes=2
        fi
    done
    echo "Minimization of JavaScript files in $SourceDirectory completed"
}

MinifyJSFiles "./lib-unminified" "./lib"
MinifyJSFiles "./utils-unminified" "./utils"