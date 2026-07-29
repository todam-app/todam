param(
  [string]$AppRoot = (Join-Path $PSScriptRoot "..\apps\todam")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$appRootPath = [System.IO.Path]::GetFullPath($AppRoot)
$assetDirectory = Join-Path $appRootPath "assets\brand"
$publicBrandDirectory = Join-Path $appRootPath "public\brand"
$publicOgDirectory = Join-Path $appRootPath "public\og"
[System.IO.Directory]::CreateDirectory($publicBrandDirectory) | Out-Null
[System.IO.Directory]::CreateDirectory($publicOgDirectory) | Out-Null

$ink = [System.Drawing.ColorTranslator]::FromHtml("#151515")
$paper = [System.Drawing.ColorTranslator]::FromHtml("#FFFDF8")
$ivory = [System.Drawing.ColorTranslator]::FromHtml("#FCF8F2")
$accent = [System.Drawing.ColorTranslator]::FromHtml("#F3A995")

function Set-BrandAccent {
  param(
    [string]$Path,
    [System.Drawing.Color]$AccentColor
  )

  if (-not [System.IO.File]::Exists($Path)) {
    return
  }

  $loaded = New-Object System.Drawing.Bitmap($Path)
  $result = New-Object System.Drawing.Bitmap(
    $loaded.Width,
    $loaded.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($result)
  try {
    $graphics.DrawImageUnscaled($loaded, 0, 0)
  } finally {
    $graphics.Dispose()
    $loaded.Dispose()
  }

  $rectangle = [System.Drawing.Rectangle]::new(0, 0, $result.Width, $result.Height)
  $bitmapData = $result.LockBits(
    $rectangle,
    [System.Drawing.Imaging.ImageLockMode]::ReadWrite,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  try {
    $byteCount = [Math]::Abs($bitmapData.Stride) * $result.Height
    $pixels = New-Object byte[] $byteCount
    [System.Runtime.InteropServices.Marshal]::Copy(
      $bitmapData.Scan0,
      $pixels,
      0,
      $byteCount
    )
    for ($index = 0; $index -lt $byteCount; $index += 4) {
      $blue = $pixels[$index]
      $green = $pixels[$index + 1]
      $red = $pixels[$index + 2]
      $alpha = $pixels[$index + 3]
      if ($alpha -gt 0 -and $red -gt 140 -and $green -lt 110 -and $blue -lt 90) {
        $pixels[$index] = $AccentColor.B
        $pixels[$index + 1] = $AccentColor.G
        $pixels[$index + 2] = $AccentColor.R
      }
    }
    [System.Runtime.InteropServices.Marshal]::Copy(
      $pixels,
      0,
      $bitmapData.Scan0,
      $byteCount
    )
  } finally {
    $result.UnlockBits($bitmapData)
  }

  try {
    $result.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $result.Dispose()
  }
}

function Save-Png {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Name
  )

  $assetPath = Join-Path $assetDirectory $Name
  $publicPath = Join-Path $publicBrandDirectory $Name
  $Bitmap.Save($assetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $Bitmap.Save($publicPath, [System.Drawing.Imaging.ImageFormat]::Png)
}

function New-OpaqueLogo {
  param(
    [System.Drawing.Bitmap]$Source,
    [System.Drawing.Color]$Background,
    [System.Drawing.Color]$InkColor,
    [System.Drawing.Color]$AccentColor,
    [bool]$Monochrome
  )

  $result = New-Object System.Drawing.Bitmap(
    $Source.Width,
    $Source.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($result)
  $graphics.Clear($Background)
  $graphics.Dispose()

  for ($y = 0; $y -lt $Source.Height; $y++) {
    for ($x = 0; $x -lt $Source.Width; $x++) {
      $pixel = $Source.GetPixel($x, $y)
      if ($pixel.A -eq 0) {
        continue
      }
      $isAccent =
        ($pixel.R -gt 140 -and $pixel.G -lt 110 -and $pixel.B -lt 90) -or
        ($pixel.R -gt 220 -and $pixel.G -gt 120 -and $pixel.G -lt 200 -and
          $pixel.B -gt 110 -and $pixel.B -lt 180)
      $target = if ($Monochrome -or -not $isAccent) { $InkColor } else { $AccentColor }
      $alpha = $pixel.A / 255.0
      $red = [int][Math]::Round($target.R * $alpha + $Background.R * (1 - $alpha))
      $green = [int][Math]::Round($target.G * $alpha + $Background.G * (1 - $alpha))
      $blue = [int][Math]::Round($target.B * $alpha + $Background.B * (1 - $alpha))
      $result.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $red, $green, $blue))
    }
  }
  return $result
}

@(
  "todam-app-icon.png",
  "todam-app-icon-foreground.png",
  "todam-favicon.png",
  "todam-logo-horizontal.png",
  "todam-logo-horizontal-source.png",
  "todam-symbol.png",
  "todam-symbol-source.png"
) | ForEach-Object {
  Set-BrandAccent -Path (Join-Path $assetDirectory $_) -AccentColor $accent
}

$sourceLogo = New-Object System.Drawing.Bitmap(
  (Join-Path $assetDirectory "todam-logo-horizontal.png")
)
$sourceSymbol = New-Object System.Drawing.Bitmap(
  (Join-Path $assetDirectory "todam-symbol.png")
)

try {
  $variants = @(
    @{
      Name = "todam-logo-horizontal-ivory.png"
      Background = $ivory
      Ink = $ink
      Accent = $accent
      Monochrome = $false
    },
    @{
      Name = "todam-logo-horizontal-inverse.png"
      Background = $ink
      Ink = $paper
      Accent = $accent
      Monochrome = $false
    },
    @{
      Name = "todam-logo-horizontal-mono-ink.png"
      Background = $ivory
      Ink = $ink
      Accent = $ink
      Monochrome = $true
    },
    @{
      Name = "todam-logo-horizontal-mono-inverse.png"
      Background = $ink
      Ink = $paper
      Accent = $paper
      Monochrome = $true
    }
  )

  foreach ($variant in $variants) {
    $bitmap = New-OpaqueLogo `
      -Source $sourceLogo `
      -Background $variant.Background `
      -InkColor $variant.Ink `
      -AccentColor $variant.Accent `
      -Monochrome $variant.Monochrome
    try {
      Save-Png -Bitmap $bitmap -Name $variant.Name
    } finally {
      $bitmap.Dispose()
    }
  }

  $tile = New-Object System.Drawing.Bitmap(
    512,
    512,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $tileGraphics = [System.Drawing.Graphics]::FromImage($tile)
  try {
    $tileGraphics.Clear($ivory)
    $tileGraphics.InterpolationMode =
      [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $tileGraphics.SmoothingMode =
      [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $targetWidth = 350
    $targetHeight = [int]($sourceSymbol.Height * $targetWidth / $sourceSymbol.Width)
    $targetX = [int]((512 - $targetWidth) / 2)
    $targetY = [int]((512 - $targetHeight) / 2)
    $tileGraphics.DrawImage(
      $sourceSymbol,
      $targetX,
      $targetY,
      $targetWidth,
      $targetHeight
    )
    Save-Png -Bitmap $tile -Name "todam-tile-opaque.png"
  } finally {
    $tileGraphics.Dispose()
    $tile.Dispose()
  }

  $og = New-Object System.Drawing.Bitmap(
    1200,
    630,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $ogGraphics = [System.Drawing.Graphics]::FromImage($og)
  $taglineFont = New-Object System.Drawing.Font(
    "Georgia",
    31,
    [System.Drawing.FontStyle]::Regular,
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $taglineBrush = New-Object System.Drawing.SolidBrush($ink)
  $accentBrush = New-Object System.Drawing.SolidBrush($accent)
  $format = New-Object System.Drawing.StringFormat
  try {
    $ogGraphics.Clear($ivory)
    $ogGraphics.InterpolationMode =
      [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $ogGraphics.SmoothingMode =
      [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $logoWidth = 820
    $logoHeight = [int]($sourceLogo.Height * $logoWidth / $sourceLogo.Width)
    $ogGraphics.DrawImage(
      $sourceLogo,
      [int]((1200 - $logoWidth) / 2),
      150,
      $logoWidth,
      $logoHeight
    )
    $ogGraphics.FillRectangle($accentBrush, 500, 415, 200, 5)
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $ogGraphics.DrawString(
      "Votre journal du spectacle vivant",
      $taglineFont,
      $taglineBrush,
      [System.Drawing.RectangleF]::new(120, 455, 960, 60),
      $format
    )
    $ogAssetPath = Join-Path $assetDirectory "todam-open-graph.png"
    $ogPublicPath = Join-Path $publicOgDirectory "todam-open-graph.png"
    $og.Save($ogAssetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $og.Save($ogPublicPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $format.Dispose()
    $accentBrush.Dispose()
    $taglineBrush.Dispose()
    $taglineFont.Dispose()
    $ogGraphics.Dispose()
    $og.Dispose()
  }
} finally {
  $sourceSymbol.Dispose()
  $sourceLogo.Dispose()
}

Write-Output "Variantes de marque Todam générées dans $assetDirectory et public/."
