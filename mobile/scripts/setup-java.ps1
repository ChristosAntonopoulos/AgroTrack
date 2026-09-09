# Optional: dot-source to set JAVA_HOME for JDK 17+ (Windows). No downloads.
# Usage: . .\scripts\setup-java.ps1

function Get-JavaMajorVersion([string]$JdkPath) {
  $java = Join-Path $JdkPath 'bin\java.exe'
  if (-not (Test-Path $java)) { return 0 }

  $errFile = Join-Path $env:TEMP "oleachron-java-ver-$PID.txt"
  $outFile = Join-Path $env:TEMP "oleachron-java-out-$PID.txt"
  try {
    foreach ($f in @($errFile, $outFile)) {
      if (Test-Path $f) { Remove-Item $f -Force }
    }
    Start-Process -FilePath $java -ArgumentList '-version' -NoNewWindow -Wait `
      -RedirectStandardError $errFile -RedirectStandardOutput $outFile | Out-Null
    $text = Get-Content $errFile -Raw -ErrorAction SilentlyContinue
    if ($text -match 'version "(\d+)') {
      return [int]$Matches[1]
    }
  } finally {
    Remove-Item $errFile, $outFile -Force -ErrorAction SilentlyContinue
  }
  return 0
}

function Set-JavaHomeIfValid([string]$JdkPath) {
  if (-not $JdkPath) { return $false }
  $version = Get-JavaMajorVersion $JdkPath
  if ($version -lt 17) { return $false }

  $env:JAVA_HOME = $JdkPath
  $env:Path = "$JdkPath\bin;" + (
    $env:Path -split ';' |
    Where-Object { $_ -and $_ -notmatch '\\java\\|\\jdk' } |
    Select-Object -Unique
  ) -join ';'
  Write-Host "JAVA_HOME=$env:JAVA_HOME (Java $version)"
  return $true
}

$candidates = @(
  $env:JAVA_HOME,
  $env:JAVA_HOME_17_X64,
  'C:\Program Files\Android\Android Studio\jbr'
)

foreach ($candidate in $candidates) {
  if (Set-JavaHomeIfValid $candidate) { return }
}

foreach ($pattern in @(
  'C:\Program Files\Eclipse Adoptium\jdk-17*',
  'C:\Program Files\Microsoft\jdk-17*',
  'C:\Program Files\Java\jdk-17*'
)) {
  Get-ChildItem $pattern -ErrorAction SilentlyContinue | ForEach-Object {
    if (Set-JavaHomeIfValid $_.FullName) { return }
  }
}

throw @"
JDK 17+ required for Android builds. Set JAVA_HOME manually, e.g.:
  `$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
Or install Android Studio (includes a bundled JDK).
"@
