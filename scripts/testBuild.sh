#!/bin/bash

LINT_MODE=true npx taro build --type weapp > build-output.txt 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    cat build-output.txt
fi

rm -f build-output.txt

if [ $EXIT_CODE -eq 0 ]; then
    if [ -d "dist" ]; then
        rm -rf /workspace/.dist
        cp -r dist /workspace/.dist
    fi
fi

exit $EXIT_CODE
