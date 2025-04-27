import * as vscode from "vscode";
import { everythingsearch } from "./EverythingSearch";

// extension entrypoint
export function activate(context: vscode.ExtensionContext) {
  everythingsearch.activate(context);
}
export function deactivate() {}
