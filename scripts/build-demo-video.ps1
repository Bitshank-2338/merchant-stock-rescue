param(
  [string]$OutputPath = "output/video/merchant-stock-rescue-demo.mp4"
)

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputPath))
$outputDirectory = Split-Path -Parent $resolvedOutput
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$temporaryDirectory = Join-Path $temporaryRoot ("merchant-stock-rescue-video-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

$slides = @(
  @{
    Image = "output/playwright/merchant-stock-rescue-dashboard.png"
    Text = "Merchant Stock Rescue is a Web M C P demo for independent merchants. When a store is out of stock, an agent handles the repetitive search and coordination, while the merchant keeps authority over whether inventory actually moves."
  },
  @{
    Image = "output/playwright/merchant-stock-rescue-dashboard.png"
    Text = "The seeded request needs two Bosch G S B six hundred drills today. The search tool returns four nearby sources, ranked by price, distance, pickup time, and reliability. The agent can also inspect one source before acting. All data is deterministic and browser local, so the demo is safe and repeatable."
  },
  @{
    Image = "output/playwright/merchant-stock-rescue-proposal.png"
    Text = "The agent prepares transfer T R zero zero zero one from Bosch Tools Indiranagar to Ace Hardware Koramangala. Preparation creates this visible proposal with product, quantity, value, and pickup estimate, but it does not reserve or change inventory. When the agent tries to commit immediately, the tool returns human approval required. The blocked attempt is recorded in the timeline."
  },
  @{
    Image = "output/playwright/merchant-stock-rescue-approved.png"
    Text = "Only the merchant can cross the approval boundary. There is no approval tool for the agent. The merchant reviews the proposal and clicks Approve transfer in the visible interface. The audit trail labels this as a human action, and the app now waits for the agent to finish the operational work."
  },
  @{
    Image = "output/playwright/merchant-stock-rescue-committed.png"
    Text = "After approval, the same commit tool succeeds exactly once. It returns transaction T X N, T R zero zero zero one, reduces source availability from eight to six, and records the agent action. The status tool then verifies that the transfer is committed and approved by a human. Duplicate, rejected, stale, invalid, and insufficient stock paths return structured failures."
  },
  @{
    Image = "output/playwright/merchant-stock-rescue-mobile.png"
    Text = "The app registers exactly five imperative Web M C P tools on one shared state store. It is built with React and TypeScript, tested with eleven automated checks plus a real Chromium browser flow, deployed on Vercel, and released under the M I T license. The principle is simple: the agent gets the labor; the merchant keeps the authority."
  }
)

try {
  Add-Type -AssemblyName System.Speech
  $segments = @()
  for ($index = 0; $index -lt $slides.Count; $index++) {
    $slide = $slides[$index]
    $imagePath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $slide.Image))
    if (-not (Test-Path -LiteralPath $imagePath)) {
      throw "Missing slide image: $imagePath"
    }

    $audioPath = Join-Path $temporaryDirectory ("audio-{0:D2}.wav" -f $index)
    $segmentPath = Join-Path $temporaryDirectory ("segment-{0:D2}.mp4" -f $index)
    $speech = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $preferredVoice = $speech.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like "*Zira*" } | Select-Object -First 1
    if ($preferredVoice) { $speech.SelectVoice($preferredVoice.VoiceInfo.Name) }
    $speech.Rate = 0
    $speech.Volume = 100
    $speech.SetOutputToWaveFile($audioPath)
    $speech.Speak($slide.Text)
    $speech.Dispose()

    $filter = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x090d1d,format=yuv420p"
    & $ffmpeg -hide_banner -loglevel error -y -loop 1 -framerate 30 -i $imagePath -i $audioPath -vf $filter -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 192k -shortest $segmentPath
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed while building segment $index" }
    $segments += $segmentPath
  }

  $concatFile = Join-Path $temporaryDirectory "segments.txt"
  $segments | ForEach-Object { "file '$($_.Replace("'", "''"))'" } | Set-Content -LiteralPath $concatFile -Encoding utf8
  & $ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i $concatFile -c copy -movflags +faststart $resolvedOutput
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed while concatenating the demo video" }

  Write-Output $resolvedOutput
}
finally {
  $resolvedTemporary = [System.IO.Path]::GetFullPath($temporaryDirectory)
  if ($resolvedTemporary.StartsWith($temporaryRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTemporary)) {
    Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
  }
}
