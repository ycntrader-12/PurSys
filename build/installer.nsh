; Custom NSIS include script for PurSys Installer Wizard
; Sets the default installation directory to D:\PurSys

!macro preInit
  SetRegView 64
  ${if} ${FileExists} "D:\"
    StrCpy $INSTDIR "D:\PurSys"
  ${else}
    StrCpy $INSTDIR "C:\PurSys"
  ${endif}
!macroend
