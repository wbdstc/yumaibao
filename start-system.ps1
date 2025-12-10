# 预埋宝系统自动启动脚本
# PowerShell脚本，用于自动启动MongoDB、MinIO、后端和前端服务

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "预埋宝智能防错定位解决方案启动脚本" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查MongoDB服务
Write-Host "1. 检查MongoDB服务..." -ForegroundColor Green
$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue

if ($mongoService -eq $null) {
    Write-Host "   MongoDB服务未安装，请手动安装并启动。" -ForegroundColor Yellow
} else {
    if ($mongoService.Status -eq "Running") {
        Write-Host "   MongoDB服务已在运行。" -ForegroundColor Green
    } else {
        Write-Host "   启动MongoDB服务..." -ForegroundColor Yellow
        Start-Service -Name "MongoDB"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   MongoDB服务启动成功。" -ForegroundColor Green
        } else {
            Write-Host "   MongoDB服务启动失败，请手动启动。" -ForegroundColor Red
        }
    }
}

Write-Host ""

# 2. 检查MinIO服务
Write-Host "2. 检查MinIO服务..." -ForegroundColor Green
$minioProcess = Get-Process -Name "minio" -ErrorAction SilentlyContinue

if ($minioProcess -eq $null) {
    Write-Host "   MinIO进程未运行，正在启动..." -ForegroundColor Yellow
    
    # 检查MinIO安装位置（假设在C:\minio目录）
    $minioPath = "C:\minio\minio.exe"
    if (-not (Test-Path $minioPath)) {
        Write-Host "   未找到MinIO可执行文件，请检查安装路径。" -ForegroundColor Red
        Write-Host "   脚本假设MinIO安装在C:\minio目录。" -ForegroundColor Yellow
    } else {
        # 启动MinIO服务
        Start-Process -FilePath $minioPath -ArgumentList "server C:\minio\data" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        
        # 检查是否启动成功
        $minioProcess = Get-Process -Name "minio" -ErrorAction SilentlyContinue
        if ($minioProcess -ne $null) {
            Write-Host "   MinIO服务启动成功，访问地址：http://localhost:9000" -ForegroundColor Green
        } else {
            Write-Host "   MinIO服务启动失败，请手动启动。" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   MinIO服务已在运行。" -ForegroundColor Green
}

Write-Host ""

# 3. 启动后端服务
Write-Host "3. 启动后端服务..." -ForegroundColor Green
$backendPath = "d:\code\cad-viewer-main\yumaobao-backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "   后端服务目录不存在：$backendPath" -ForegroundColor Red
} else {
    # 检查后端是否已在运行
    $backendProcess = Get-Process | Where-Object {$_.CommandLine -like "*yumaobao-backend*" -and $_.CommandLine -like "*npm run dev*"}
    
    if ($backendProcess -eq $null) {
        Write-Host "   启动后端服务..." -ForegroundColor Yellow
        Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit -Command `"cd '$backendPath'; npm run dev`"" -WorkingDirectory $backendPath
        Write-Host "   后端服务已启动，访问地址：http://localhost:3000" -ForegroundColor Green
    } else {
        Write-Host "   后端服务已在运行。" -ForegroundColor Green
    }
}

Write-Host ""

# 4. 启动前端服务
Write-Host "4. 启动前端服务..." -ForegroundColor Green
$frontendPath = "d:\code\cad-viewer-main\yumaobao-frontend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "   前端服务目录不存在：$frontendPath" -ForegroundColor Red
} else {
    # 检查前端是否已在运行
    $frontendProcess = Get-Process | Where-Object {$_.CommandLine -like "*yumaobao-frontend*" -and $_.CommandLine -like "*npm run dev*"}
    
    if ($frontendProcess -eq $null) {
        Write-Host "   启动前端服务..." -ForegroundColor Yellow
        Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit -Command `"cd '$frontendPath'; npm run dev`"" -WorkingDirectory $frontendPath
        Write-Host "   前端服务已启动，访问地址：通常是 http://localhost:5173（请查看终端输出）" -ForegroundColor Green
    } else {
        Write-Host "   前端服务已在运行。" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "系统启动完成！" -ForegroundColor Cyan
Write-Host "请检查各服务终端输出，确保服务正常运行。" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan