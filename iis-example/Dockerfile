FROM mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2019

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

# enable required Windows features
RUN powershell Add-WindowsFeature Web-Asp-Net45,Web-Http-Tracing,Web-Scripting-Tools,Web-WebSockets

# download installers
ADD https://github.com/azure/iisnode/releases/download/v0.2.21/iisnode-full-v0.2.21-x64.msi /iisnode-full-x64.msi
ADD https://nodejs.org/dist/v21.5.0/node-v21.5.0-x64.msi /node-x64.msi
ADD https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi /rewrite_amd64.msi

# install iisnode/node/rewrite module
RUN Start-Process 'C:\rewrite_amd64.msi' '/qn /norestart /L*V "C:\urlrewrite.log"' -PassThru | Wait-Process;
RUN Start-Process 'C:\iisnode-full-x64.msi' '/qn /norestart /L*V "C:\iisnode.log"' -PassThru | Wait-Process;
RUN Start-Process 'C:\node-x64.msi' '/qn /norestart /L*V "C:\node.log"' -PassThru | Wait-Process;

# setup Remote IIS management
RUN Install-WindowsFeature Web-Mgmt-Service; \
    New-ItemProperty -Path HKLM:\software\microsoft\WebManagement\Server -Name EnableRemoteManagement -Value 1 -Force; \
    Set-Service -Name wmsvc -StartupType automatic;

# add user for Remote IIS Manager Login - as this example is not intended to be
# used in production and held within a container, we use a hardcoded password
# of "Password~1234"
RUN net user iisadmin Password~1234 /ADD; \
    net localgroup administrators iisadmin /add;
