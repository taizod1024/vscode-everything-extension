# Search Prompt Template

## Basic Template
```
{searchTerm}
```

## Advanced Template with Filters
```
{searchTerm} ext:{extensions}
```

## Path-specific Template
```
{searchTerm} path:{folderPath}
```

## Combined Template
```
{searchTerm} ext:{extensions} path:{folderPath}
```

## Variables
- `{searchTerm}` - The user's search query
- `{extensions}` - File extensions to filter (e.g., "js;ts;py")
- `{folderPath}` - Specific folder path to search in

## Examples
1. Search for JavaScript files: `myFile ext:js;ts`
2. Search in specific folder: `config path:C:\Projects`
3. Combined search: `test ext:js;ts path:C:\Projects\src`
