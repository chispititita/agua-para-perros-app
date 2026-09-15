' Crea (o repara) el acceso directo "Agua Para Perros" en el Escritorio.
' Lo ejecuta automaticamente instalar.bat; tambien puedes hacerle doble
' clic a mano si borraste el icono del escritorio por error.

Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
strDesktop = oShell.SpecialFolders("Desktop")

Set oShortcut = oShell.CreateShortcut(strDesktop & "\Agua Para Perros.lnk")
oShortcut.TargetPath = strScriptDir & "\iniciar_silencioso.vbs"
oShortcut.WorkingDirectory = strScriptDir
oShortcut.IconLocation = strScriptDir & "\escritorio\icono.ico"
oShortcut.Description = "Agua Para Perros - App de Dropshipping"
oShortcut.WindowStyle = 7
oShortcut.Save

MsgBox "Se creo el icono ""Agua Para Perros"" en tu escritorio." & vbCrLf & _
       "Usalo a partir de ahora para abrir la app.", vbInformation, "Listo"
