import * as vscode from "vscode";
import { everythingextension } from "./EverythingExtension";

// extension entrypoint
export function activate(context: vscode.ExtensionContext) {
  everythingextension.activate(context);
}
export function deactivate() {}
