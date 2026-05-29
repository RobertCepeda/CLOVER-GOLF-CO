Add-Type -AssemblyName System.Drawing

function Color-Hex([string]$hex) {
  [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function Brush([string]$hex) {
  New-Object System.Drawing.SolidBrush (Color-Hex $hex)
}

function Pen([string]$hex, [float]$width = 2) {
  $pen = New-Object System.Drawing.Pen (Color-Hex $hex), $width
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pen
}

function Fill-Round($g, [System.Drawing.RectangleF]$rect, [float]$radius, $brush, $pen) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $radius * 2
  $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.FillPath($brush, $path)
  if ($pen) {
    $g.DrawPath($pen, $path)
  }
  $path.Dispose()
}

function Draw-Label($g, [string]$text, [System.Drawing.RectangleF]$rect) {
  $font = [System.Drawing.Font]::new("Arial", 20, [System.Drawing.FontStyle]::Bold)
  $textBrush = Brush "#123f27"
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Near
  $format.LineAlignment = [System.Drawing.StringAlignment]::Near
  $g.DrawString($text, $font, $textBrush, $rect, $format)
  $format.Dispose()
  $textBrush.Dispose()
  $font.Dispose()
}

function Draw-Panel($g, [System.Drawing.RectangleF]$rect, [string]$label) {
  $shadow = Brush "#e9ddbf"
  Fill-Round $g ([System.Drawing.RectangleF]::new($rect.X + 8, $rect.Y + 10, $rect.Width, $rect.Height)) 22 $shadow $null
  $shadow.Dispose()

  $fill = Brush "#ffffff"
  $line = Pen "#d8d0bb" 2
  Fill-Round $g $rect 22 $fill $line
  $fill.Dispose()
  $line.Dispose()

  Draw-Label $g $label ([System.Drawing.RectangleF]::new($rect.X + 24, $rect.Y + 20, $rect.Width - 48, 36))
}

function Fit-Image($g, [string]$path, [System.Drawing.RectangleF]$rect) {
  $img = [System.Drawing.Image]::FromFile($path)
  $scale = [Math]::Min($rect.Width / $img.Width, $rect.Height / $img.Height)
  $dw = $img.Width * $scale
  $dh = $img.Height * $scale
  $dx = $rect.X + (($rect.Width - $dw) / 2)
  $dy = $rect.Y + (($rect.Height - $dh) / 2)
  $g.DrawImage($img, [System.Drawing.RectangleF]::new($dx, $dy, $dw, $dh))
  $img.Dispose()
}

function Stripe-Fill($g, $path, [System.Drawing.RectangleF]$bounds, [string]$a, [string]$b) {
  $state = $g.Save()
  $g.SetClip($path)
  $brushA = Brush $a
  $brushB = Brush $b
  $stripe = 54.0
  for ($x = $bounds.X - 120; $x -lt $bounds.Right + 120; $x += $stripe) {
    $g.FillRectangle($brushA, [System.Drawing.RectangleF]::new($x, $bounds.Y, $stripe / 2, $bounds.Height))
    $g.FillRectangle($brushB, [System.Drawing.RectangleF]::new($x + ($stripe / 2), $bounds.Y, $stripe / 2, $bounds.Height))
  }
  $brushA.Dispose()
  $brushB.Dispose()
  $g.Restore($state)
}

function Draw-ClassicSide($g, [System.Drawing.RectangleF]$r, $m) {
  $crown = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $crown.StartFigure()
  $crown.AddBezier($r.X + 120, $r.Y + 278, $r.X + 190, $r.Y + 92, $r.X + 530, $r.Y + 96, $r.X + 596, $r.Y + 285)
  $crown.AddLine($r.X + 596, $r.Y + 285, $r.X + 572, $r.Y + 338)
  $crown.AddBezier($r.X + 572, $r.Y + 338, $r.X + 430, $r.Y + 370, $r.X + 220, $r.Y + 358, $r.X + 118, $r.Y + 316)
  $crown.CloseFigure()

  if ($m.Stripe) {
    Stripe-Fill $g $crown ([System.Drawing.RectangleF]::new($r.X + 100, $r.Y + 84, 520, 280)) $m.Crown $m.Panel
  } else {
    $b = Brush $m.Crown
    $g.FillPath($b, $crown)
    $b.Dispose()
  }

  $outline = Pen $m.Seam 4
  $g.DrawPath($outline, $crown)
  $outline.Dispose()

  $seam = Pen $m.Trim 3
  $g.DrawBezier($seam, $r.X + 290, $r.Y + 110, $r.X + 260, $r.Y + 190, $r.X + 250, $r.Y + 266, $r.X + 256, $r.Y + 350)
  $g.DrawBezier($seam, $r.X + 420, $r.Y + 106, $r.X + 395, $r.Y + 188, $r.X + 390, $r.Y + 263, $r.X + 398, $r.Y + 352)
  $seam.Dispose()

  $brim = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $brim.StartFigure()
  $brim.AddBezier($r.X + 84, $r.Y + 306, $r.X + 215, $r.Y + 392, $r.X + 510, $r.Y + 410, $r.X + 664, $r.Y + 332)
  $brim.AddBezier($r.X + 664, $r.Y + 332, $r.X + 566, $r.Y + 404, $r.X + 286, $r.Y + 436, $r.X + 96, $r.Y + 348)
  $brim.CloseFigure()

  if ($m.Stripe) {
    Stripe-Fill $g $brim ([System.Drawing.RectangleF]::new($r.X + 80, $r.Y + 300, 590, 145)) $m.Brim $m.Panel
  } else {
    $bb = Brush $m.Brim
    $g.FillPath($bb, $brim)
    $bb.Dispose()
  }

  $bp = Pen $m.Trim 5
  $g.DrawPath($bp, $brim)
  for ($i = 0; $i -lt 5; $i++) {
    $g.DrawBezier($bp, $r.X + 170, $r.Y + 336 + ($i * 14), $r.X + 300, $r.Y + 376 + ($i * 8), $r.X + 490, $r.Y + 376 + ($i * 3), $r.X + 620, $r.Y + 342 + ($i * 3))
  }
  $bp.Dispose()

  $eye = Brush $m.Trim
  $g.FillEllipse($eye, $r.X + 354, $r.Y + 174, 18, 18)
  $g.FillEllipse($eye, $r.X + 496, $r.Y + 196, 18, 18)
  $eye.Dispose()
  $crown.Dispose()
  $brim.Dispose()
}

function Draw-ClassicBack($g, [System.Drawing.RectangleF]$r, $m) {
  $crown = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $crown.StartFigure()
  $crown.AddBezier($r.X + 162, $r.Y + 96, $r.X + 260, $r.Y + 52, $r.X + 492, $r.Y + 52, $r.X + 590, $r.Y + 96)
  $crown.AddLine($r.X + 590, $r.Y + 96, $r.X + 620, $r.Y + 315)
  $crown.AddBezier($r.X + 620, $r.Y + 315, $r.X + 520, $r.Y + 390, $r.X + 235, $r.Y + 390, $r.X + 134, $r.Y + 315)
  $crown.AddLine($r.X + 134, $r.Y + 315, $r.X + 162, $r.Y + 96)
  $crown.CloseFigure()

  if ($m.Stripe) {
    Stripe-Fill $g $crown ([System.Drawing.RectangleF]::new($r.X + 120, $r.Y + 50, 530, 350)) $m.Crown $m.Panel
  } else {
    $b = Brush $m.Back
    $g.FillPath($b, $crown)
    $b.Dispose()
  }

  $pen = Pen $m.Seam 4
  $g.DrawPath($pen, $crown)
  $pen.Dispose()

  $cut = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $cut.AddBezier($r.X + 284, $r.Y + 252, $r.X + 306, $r.Y + 204, $r.X + 448, $r.Y + 204, $r.X + 470, $r.Y + 252)
  $cut.AddBezier($r.X + 470, $r.Y + 252, $r.X + 450, $r.Y + 318, $r.X + 304, $r.Y + 318, $r.X + 284, $r.Y + 252)
  $white = Brush "#ffffff"
  $g.FillPath($white, $cut)
  $white.Dispose()

  $strap = Brush $m.Trim
  Fill-Round $g ([System.Drawing.RectangleF]::new($r.X + 265, $r.Y + 307, 250, 38)) 16 $strap $null
  $strap.Dispose()

  $buckle = Pen $m.Accent 7
  $g.DrawRectangle($buckle, $r.X + 484, $r.Y + 300, 56, 52)
  $buckle.Dispose()

  $seam = Pen $m.Seam 2
  $g.DrawLine($seam, $r.X + 376, $r.Y + 72, $r.X + 376, $r.Y + 204)
  $g.DrawLine($seam, $r.X + 248, $r.Y + 106, $r.X + 294, $r.Y + 242)
  $g.DrawLine($seam, $r.X + 506, $r.Y + 106, $r.X + 460, $r.Y + 242)
  $seam.Dispose()
  $cut.Dispose()
  $crown.Dispose()
}

function Draw-ClassicInterior($g, [System.Drawing.RectangleF]$r, $m) {
  $brim = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $brim.AddBezier($r.X + 180, $r.Y + 318, $r.X + 285, $r.Y + 420, $r.X + 484, $r.Y + 420, $r.X + 586, $r.Y + 318)
  $brim.AddBezier($r.X + 586, $r.Y + 318, $r.X + 530, $r.Y + 250, $r.X + 230, $r.Y + 250, $r.X + 180, $r.Y + 318)
  $brim.CloseFigure()
  $b = Brush $m.Brim
  $g.FillPath($b, $brim)
  $b.Dispose()

  $innerBrush = Brush $m.Panel
  $g.FillEllipse($innerBrush, $r.X + 198, $r.Y + 76, 360, 300)
  $innerBrush.Dispose()

  $band = Pen "#1b1e1a" 18
  $g.DrawEllipse($band, $r.X + 198, $r.Y + 76, 360, 300)
  $band.Dispose()

  $seam = Pen $m.Seam 4
  $g.DrawLine($seam, $r.X + 378, $r.Y + 80, $r.X + 378, $r.Y + 370)
  $g.DrawLine($seam, $r.X + 214, $r.Y + 210, $r.X + 548, $r.Y + 210)
  $g.DrawLine($seam, $r.X + 264, $r.Y + 104, $r.X + 492, $r.Y + 340)
  $g.DrawLine($seam, $r.X + 492, $r.Y + 104, $r.X + 264, $r.Y + 340)
  for ($i = 0; $i -lt 6; $i++) {
    $g.DrawArc($seam, $r.X + 232 + ($i * 16), $r.Y + 292 + ($i * 4), 292 - ($i * 22), 66 - ($i * 3), 190, 160)
  }
  $seam.Dispose()
  $brim.Dispose()
}

function Draw-Bucket($g, [System.Drawing.RectangleF]$r, $m) {
  $fill = Brush $m.Crown
  $line = Pen $m.Seam 4
  $body = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $body.AddBezier($r.X + 210, $r.Y + 120, $r.X + 300, $r.Y + 80, $r.X + 505, $r.Y + 95, $r.X + 560, $r.Y + 150)
  $body.AddLine($r.X + 560, $r.Y + 150, $r.X + 595, $r.Y + 310)
  $body.AddBezier($r.X + 595, $r.Y + 310, $r.X + 430, $r.Y + 370, $r.X + 245, $r.Y + 350, $r.X + 150, $r.Y + 304)
  $body.AddLine($r.X + 150, $r.Y + 304, $r.X + 210, $r.Y + 120)
  $body.CloseFigure()
  $g.FillPath($fill, $body)
  $g.DrawPath($line, $body)

  $brim = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $brim.AddBezier($r.X + 95, $r.Y + 310, $r.X + 250, $r.Y + 430, $r.X + 540, $r.Y + 430, $r.X + 685, $r.Y + 330)
  $brim.AddBezier($r.X + 685, $r.Y + 330, $r.X + 510, $r.Y + 470, $r.X + 230, $r.Y + 470, $r.X + 80, $r.Y + 345)
  $brim.CloseFigure()
  $g.FillPath($fill, $brim)
  $g.DrawPath($line, $brim)
  for ($i = 0; $i -lt 5; $i++) {
    $g.DrawBezier($line, $r.X + 128, $r.Y + 340 + ($i * 16), $r.X + 280, $r.Y + 420 + ($i * 7), $r.X + 520, $r.Y + 416 + ($i * 4), $r.X + 650, $r.Y + 342 + ($i * 8))
  }
  $body.Dispose()
  $brim.Dispose()
  $line.Dispose()
  $fill.Dispose()
}

function Draw-Visor($g, [System.Drawing.RectangleF]$r, $m) {
  $band = Brush $m.Crown
  $line = Pen $m.Trim 4
  $bandPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $bandPath.AddBezier($r.X + 190, $r.Y + 170, $r.X + 320, $r.Y + 110, $r.X + 540, $r.Y + 125, $r.X + 620, $r.Y + 190)
  $bandPath.AddLine($r.X + 620, $r.Y + 190, $r.X + 590, $r.Y + 275)
  $bandPath.AddBezier($r.X + 590, $r.Y + 275, $r.X + 400, $r.Y + 235, $r.X + 270, $r.Y + 250, $r.X + 168, $r.Y + 288)
  $bandPath.AddLine($r.X + 168, $r.Y + 288, $r.X + 190, $r.Y + 170)
  $bandPath.CloseFigure()
  $g.FillPath($band, $bandPath)
  $g.DrawPath($line, $bandPath)

  $brim = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $brim.AddBezier($r.X + 80, $r.Y + 286, $r.X + 230, $r.Y + 390, $r.X + 500, $r.Y + 405, $r.X + 685, $r.Y + 306)
  $brim.AddBezier($r.X + 685, $r.Y + 306, $r.X + 522, $r.Y + 440, $r.X + 240, $r.Y + 440, $r.X + 88, $r.Y + 326)
  $brim.CloseFigure()
  $bb = Brush $m.Brim
  $g.FillPath($bb, $brim)
  $g.DrawPath($line, $brim)

  $mesh = Pen "#d8d0bb" 2
  for ($x = $r.X + 250; $x -lt $r.X + 590; $x += 18) {
    $g.DrawLine($mesh, $x, $r.Y + 160, $x - 38, $r.Y + 260)
    $g.DrawLine($mesh, $x, $r.Y + 260, $x + 38, $r.Y + 160)
  }
  $mesh.Dispose()
  $bb.Dispose()
  $band.Dispose()
  $line.Dispose()
  $bandPath.Dispose()
  $brim.Dispose()
}

function Draw-Side($g, [System.Drawing.RectangleF]$r, $m) {
  if ($m.Type -eq "bucket") {
    Draw-Bucket $g $r $m
  } elseif ($m.Type -eq "visor") {
    Draw-Visor $g $r $m
  } else {
    Draw-ClassicSide $g $r $m
  }
}

function Draw-Back($g, [System.Drawing.RectangleF]$r, $m) {
  if ($m.Type -eq "bucket") {
    Draw-Bucket $g $r $m
  } elseif ($m.Type -eq "visor") {
    Draw-Visor $g $r $m
    $strap = Brush $m.Trim
    Fill-Round $g ([System.Drawing.RectangleF]::new($r.X + 260, $r.Y + 305, 250, 38)) 16 $strap $null
    $strap.Dispose()
  } else {
    Draw-ClassicBack $g $r $m
  }
}

function Draw-Interior($g, [System.Drawing.RectangleF]$r, $m) {
  if ($m.Type -eq "bucket") {
    Draw-Bucket $g $r $m
  } elseif ($m.Type -eq "visor") {
    Draw-Visor $g $r $m
  } else {
    Draw-ClassicInterior $g $r $m
  }
}

function Make-Board($m) {
  $canvas = [System.Drawing.Bitmap]::new(1536, 1024)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $bg = Brush "#fbf6e8"
  $g.FillRectangle($bg, 0, 0, 1536, 1024)
  $bg.Dispose()

  $panels = @(
    [System.Drawing.RectangleF]::new(44, 44, 712, 456),
    [System.Drawing.RectangleF]::new(780, 44, 712, 456),
    [System.Drawing.RectangleF]::new(44, 524, 712, 456),
    [System.Drawing.RectangleF]::new(780, 524, 712, 456)
  )

  Draw-Panel $g $panels[0] "Frente"
  Draw-Panel $g $panels[1] "Perfil"
  Draw-Panel $g $panels[2] "Posterior"
  Draw-Panel $g $panels[3] "Interior"

  Fit-Image $g $m.Front ([System.Drawing.RectangleF]::new($panels[0].X + 30, $panels[0].Y + 72, $panels[0].Width - 60, $panels[0].Height - 102))
  Draw-Side $g ([System.Drawing.RectangleF]::new($panels[1].X + 4, $panels[1].Y + 34, 700, 390)) $m
  Draw-Back $g ([System.Drawing.RectangleF]::new($panels[2].X + 4, $panels[2].Y + 40, 700, 390)) $m
  Draw-Interior $g ([System.Drawing.RectangleF]::new($panels[3].X + 4, $panels[3].Y + 40, 700, 390)) $m

  $out = Join-Path (Get-Location).Path ("assets\cap-360-" + $m.Slug + ".png")
  $tmp = "$out.tmp.png"
  $canvas.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $canvas.Dispose()
  Move-Item -LiteralPath $tmp -Destination $out -Force
}

$root = (Get-Location).Path
$models = @(
  @{Slug="cream-fairway"; Front=(Join-Path $root "assets\cap-womens-cream-fairway.png"); Type="classic"; Crown="#f2e9cf"; Panel="#fbf6e8"; Back="#f2e9cf"; Brim="#123f27"; Trim="#123f27"; Seam="#0b2d1b"; Accent="#6f8420"; Stripe=$false},
  @{Slug="signature-leather"; Front=(Join-Path $root "assets\cap-signature-leather.png"); Type="classic"; Crown="#f2e9cf"; Panel="#fbf6e8"; Back="#123f27"; Brim="#123f27"; Trim="#a86332"; Seam="#0b2d1b"; Accent="#a86332"; Stripe=$false},
  @{Slug="forest-classic"; Front=(Join-Path $root "assets\cap-forest-classic.png"); Type="classic"; Crown="#123f27"; Panel="#123f27"; Back="#123f27"; Brim="#123f27"; Trim="#f2e9cf"; Seam="#0b2d1b"; Accent="#f2e9cf"; Stripe=$false},
  @{Slug="stripe-course"; Front=(Join-Path $root "assets\cap-stripe-course.png"); Type="classic"; Crown="#123f27"; Panel="#f2e9cf"; Back="#123f27"; Brim="#123f27"; Trim="#f2e9cf"; Seam="#0b2d1b"; Accent="#f2e9cf"; Stripe=$true},
  @{Slug="cream-heritage"; Front=(Join-Path $root "assets\cap-cream-heritage.png"); Type="classic"; Crown="#f2e9cf"; Panel="#fbf6e8"; Back="#f2e9cf"; Brim="#f2e9cf"; Trim="#123f27"; Seam="#d8d0bb"; Accent="#6f8420"; Stripe=$false},
  @{Slug="olive-performance"; Front=(Join-Path $root "assets\cap-olive-performance.png"); Type="classic"; Crown="#565a32"; Panel="#565a32"; Back="#565a32"; Brim="#565a32"; Trim="#f2e9cf"; Seam="#34381f"; Accent="#f2e9cf"; Stripe=$false},
  @{Slug="tour-cream"; Front=(Join-Path $root "assets\cap-tour-cream.png"); Type="classic"; Crown="#f2e9cf"; Panel="#fbf6e8"; Back="#f2e9cf"; Brim="#123f27"; Trim="#123f27"; Seam="#d8d0bb"; Accent="#6f8420"; Stripe=$false},
  @{Slug="womens-bucket"; Front=(Join-Path $root "assets\cap-womens-bucket.png"); Type="bucket"; Crown="#f2e9cf"; Panel="#fbf6e8"; Back="#f2e9cf"; Brim="#f2e9cf"; Trim="#d8d0bb"; Seam="#d8d0bb"; Accent="#6f8420"; Stripe=$false},
  @{Slug="jiuguva-visor"; Front=(Join-Path $root "assets\cap-womens-visor.png"); Type="visor"; Crown="#ffffff"; Panel="#f7f3e8"; Back="#ffffff"; Brim="#ffffff"; Trim="#123f27"; Seam="#d8d0bb"; Accent="#6f8420"; Stripe=$false},
  @{Slug="fairway-classic"; Front=(Join-Path $root "assets\cap-womens-fairway-classic.png"); Type="classic"; Crown="#123f27"; Panel="#123f27"; Back="#123f27"; Brim="#123f27"; Trim="#f2e9cf"; Seam="#0b2d1b"; Accent="#f2e9cf"; Stripe=$false}
)

$models | ForEach-Object { Make-Board $_ }
Get-ChildItem assets\cap-360-*.png | Select-Object Name, Length, LastWriteTime
