#!/bin/sh
mkdir -p patches
git diff --no-index repository_before repository_after > patches/diff.patch
