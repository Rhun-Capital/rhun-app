#!/bin/bash

# Find all TypeScript files in app/api that import from aws-sdk
FILES=$(find app/api -type f -name "*.ts" -exec grep -l "import.*from 'aws-sdk'" {} \;)

# Loop through each file
for file in $FILES; do
  echo "Processing $file"
  
  # Check if the file already has the runtime config
  if grep -q "export const runtime" "$file"; then
    echo "  - File already has runtime config, skipping"
  else
    # Add the runtime config after imports
    # We'll look for the first blank line after imports
    awk '
      /^import/ {in_import = 1; print; next}
      in_import && /^$/ {in_import = 0; print; print "export const runtime = '\''nodejs'\'';\n"; next}
      {print}
    ' "$file" > "$file.new"
    
    # Replace the original file
    mv "$file.new" "$file"
    echo "  - Added runtime config to $file"
  fi
done

echo "Done processing files" 