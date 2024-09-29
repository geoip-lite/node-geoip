<#
.SYNOPSIS
   MinifyJSFiles function minimizes JavaScript files from a source directory and saves them to an output directory using Terser.

.DESCRIPTION
   The MinifyJSFiles function checks if the output directory exists, creates it if it does not exist, and then minimizes all .js files
   from the source directory, saving them with the same names in the output directory.

.PARAMETER SourceDirectory
   The source directory containing the unminified JavaScript files.

.PARAMETER OutputDirectory
   The output directory where the minimized files will be saved.
#>

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

        # Check if the source directory exists
        if (-not (Test-Path -Path $SourceDirectory -PathType Container)) {
            throw "Source directory does not exist: $SourceDirectory"
        }

        # Remove the existing output directory if it exists
        if (Test-Path -Path $OutputDirectory -PathType Container) {
            Write-Host "Removing existing output directory: $OutputDirectory"
            Remove-Item -Path $OutputDirectory -Recurse -Force
        }

        # Create the output directory
        Write-Host "Creating output directory: $OutputDirectory"
        New-Item -ItemType Directory -Force -Path $OutputDirectory

        # Minimize JavaScript files from the source directory and save them to the output directory using Terser
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

# Minimize files in the specified directories
MinifyJSFiles -SourceDirectory ".\lib-unminified" -OutputDirectory ".\lib"
MinifyJSFiles -SourceDirectory ".\utils-unminified" -OutputDirectory ".\utils"
MinifyJSFiles -SourceDirectory ".\test-unminified" -OutputDirectory ".\test"