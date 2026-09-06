param(
  [Parameter(Mandatory = $true)] [string] $Source
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root 'build-assets/icons'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$image = [System.Drawing.Bitmap]::new($Source)
try {
  $left = $image.Width; $top = $image.Height; $right = 0; $bottom = 0
  for ($y = 0; $y -lt $image.Height; $y += 2) {
    for ($x = 0; $x -lt $image.Width; $x += 2) {
      if ($image.GetPixel($x, $y).A -gt 8) { $left = [Math]::Min($left, $x); $top = [Math]::Min($top, $y); $right = [Math]::Max($right, $x); $bottom = [Math]::Max($bottom, $y) }
    }
  }
  $crop = [System.Drawing.Rectangle]::FromLTRB([Math]::Max(0, $left - 8), [Math]::Max(0, $top - 8), [Math]::Min($image.Width, $right + 9), [Math]::Min($image.Height, $bottom + 9))
  $sizes = 16, 32, 48, 64, 128, 256, 512, 1024
  $pngFiles = @()
  foreach ($size in $sizes) {
    $canvas = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($canvas)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $scale = [Math]::Min(($size * 0.92) / $crop.Width, ($size * 0.92) / $crop.Height)
        $width = [int]($crop.Width * $scale); $height = [int]($crop.Height * $scale)
        $destination = [System.Drawing.Rectangle]::new([int](($size - $width) / 2), [int](($size - $height) / 2), $width, $height)
        $graphics.DrawImage($image, $destination, $crop, [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $file = Join-Path $output "icon-$size.png"
      $canvas.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
      $pngFiles += $file
    } finally { $canvas.Dispose() }
  }
  Copy-Item (Join-Path $output 'icon-256.png') (Join-Path $output 'icon.png') -Force
  Copy-Item (Join-Path $output 'icon-32.png') (Join-Path $root 'public/favicon.png') -Force
  $icoEntries = $pngFiles | Where-Object { (Get-Item $_).BaseName -match 'icon-(16|32|48|64|128|256)' }
  $writer = [System.IO.BinaryWriter]::new([System.IO.File]::Open((Join-Path $output 'icon.ico'), [System.IO.FileMode]::Create))
  try {
    $writer.Write([UInt16]0); $writer.Write([UInt16]1); $writer.Write([UInt16]$icoEntries.Count)
    $offset = 6 + (16 * $icoEntries.Count)
    foreach ($file in $icoEntries) { $data = [System.IO.File]::ReadAllBytes($file); $size = [int]((Get-Item $file).BaseName.Replace('icon-', '')); $writer.Write([byte]($size % 256)); $writer.Write([byte]($size % 256)); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([UInt16]1); $writer.Write([UInt16]32); $writer.Write([UInt32]$data.Length); $writer.Write([UInt32]$offset); $offset += $data.Length }
    foreach ($file in $icoEntries) { $writer.Write([System.IO.File]::ReadAllBytes($file)) }
  } finally { $writer.Dispose() }
  $icnsTypes = @{ '16' = 'icp4'; '32' = 'icp5'; '64' = 'icp6'; '128' = 'ic07'; '256' = 'ic08'; '512' = 'ic09'; '1024' = 'ic10' }
  $chunks = foreach ($size in $icnsTypes.Keys) { $data = [System.IO.File]::ReadAllBytes((Join-Path $output "icon-$size.png")); @{ Type = $icnsTypes[$size]; Data = $data } }
  $total = 8 + (($chunks | ForEach-Object { 8 + $_.Data.Length }) | Measure-Object -Sum).Sum
  $stream = [System.IO.File]::Open((Join-Path $output 'icon.icns'), [System.IO.FileMode]::Create); $writer = [System.IO.BinaryWriter]::new($stream)
  try {
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('icns')); $bytes = [BitConverter]::GetBytes([UInt32]$total); [Array]::Reverse($bytes); $writer.Write($bytes)
    foreach ($chunk in $chunks) { $writer.Write([System.Text.Encoding]::ASCII.GetBytes($chunk.Type)); $length = 8 + $chunk.Data.Length; $bytes = [BitConverter]::GetBytes([UInt32]$length); [Array]::Reverse($bytes); $writer.Write($bytes); $writer.Write($chunk.Data) }
  } finally { $writer.Dispose(); $stream.Dispose() }
} finally { $image.Dispose() }
