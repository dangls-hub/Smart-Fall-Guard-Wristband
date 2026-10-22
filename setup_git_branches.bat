@echo off
REM ==============================================================================
REM SCRIPT KHOI TAO GIT VA TAO PHAN NHANH TU DONG CHO NHOM 4 - GEHIHI (WINDOWS)
REM Du an: Vong tay thong minh canh bao te nga (Smart Fall-Guard Wristband)
REM ==============================================================================

echo [1/4] Dang khoi tao Git Repository...
git init
git checkout -B main

echo [2/4] Dang commit toan bo cau truc thu muc va file khung...
git add .
git commit -m "chore: initialize project structure, spiral docs, and skeleton files for Group 4 GEHIHI"

echo [3/4] Dang tao nhanh develop va cac nhanh phan cong thanh vien...
git checkout -b develop

REM Nhanh theo thanh vien chuyen trach
git branch feat/firmware-esp32
git branch feat/iot-infra-broker
git branch feat/backend-server
git branch feat/frontend-dashboard

REM Nhanh theo tung giai doan Spiral
git branch spiral-1/foundation
git branch spiral-2/core-algorithm-realtime
git branch spiral-3/resilience-alert-simulator
git branch spiral-4/testing-kpis-delivery

git checkout main

echo [4/4] Danh sach cac nhanh da tao:
git branch -a

IF NOT "%~1"=="" (
    echo Dang ket noi GitHub Remote: %~1
    git remote add origin %~1
    git push -u origin --all
    echo Hoan tat day toan bo nhanh len GitHub!
) ELSE (
    echo.
    echo ========================================================================
    echo HUONG DAN DAY LEN GITHUB NHOM:
    echo   git remote add origin https://github.com/ten-nhom/ten-repo.git
    echo   git push -u origin --all
    echo ========================================================================
)
