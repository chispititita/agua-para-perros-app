' Lanza la app de escritorio sin ventana de consola visible.
' Esto es lo que apunta el acceso directo del Escritorio.

Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

pythonw = strScriptDir & "\.venv\Scripts\pythonw.exe"

If Not fso.FileExists(pythonw) Then
    MsgBox "Todavia no instalaste la app." & vbCrLf & _
           "Haz doble clic primero en 'instalar.bat' (una sola vez).", _
           vbExclamation, "Falta instalar"
    WScript.Quit
End If

oShell.CurrentDirectory = strScriptDir
oShell.Run """" & pythonw & """ escritorio_app.py", 0, False
