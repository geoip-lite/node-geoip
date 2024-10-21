function MinifyJSFiles {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory=$true)]
        [string]$SourceDirectory,

        [Parameter(Mandatory=$true)]
        [string]$OutputDirectory
    )

    try {
        Write-Host "Minimizing JavaScript files in $SourceDirectory and saving to $OutputDirectory"

        if (-not (Test-Path -Path $SourceDirectory -PathType Container)) {
            throw "Source directory does not exist: $SourceDirectory"
        }

        if (Test-Path -Path $OutputDirectory -PathType Container) {
            Write-Host "Removing existing output directory: $OutputDirectory"
            Remove-Item -Path $OutputDirectory -Recurse -Force
        }

        Write-Host "Creating output directory: $OutputDirectory"
        New-Item -ItemType Directory -Force -Path $OutputDirectory

        Get-ChildItem "$SourceDirectory\*.js" | ForEach-Object {
            $FileName = $_.Name
            $OutputFileName = Join-Path $OutputDirectory $FileName
            Write-Host "Minimizing $($_.FullName) and saving to $OutputFileName"
            npx terser $_.FullName -o $OutputFileName --mangle --ecma 2024 --compress --format quote_style=1 --toplevel --timings --passes=2
        }
        Write-Host "Minimization of JavaScript files in $SourceDirectory completed"
    }
    catch {
        Write-Error "An error occurred: $_"
    }
}

MinifyJSFiles -SourceDirectory ".\lib-unminified" -OutputDirectory ".\lib"
MinifyJSFiles -SourceDirectory ".\utils-unminified" -OutputDirectory ".\utils"