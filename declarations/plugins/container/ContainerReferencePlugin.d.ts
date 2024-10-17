/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

/**
 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
 */
export type ExternalsType =
	| {
			/**
			 * Literal string values of the supported external types.
			 */
			amd?: ExternalsTypeLiteral;
			/**
			 * Literal string values of the supported external types.
			 */
			commonjs?: ExternalsTypeLiteral;
			/**
			 * Literal string values of the supported external types.
			 */
			"dynamic-import"?: ExternalsTypeLiteral;
			/**
			 * Literal string values of the supported external types.
			 */
			fallback?: ExternalsTypeLiteral;
			/**
			 * Literal string values of the supported external types.
			 */
			"static-import"?: ExternalsTypeLiteral;
	  }
	| ExternalsTypeLiteral;
/**
 * Literal string values of the supported external types.
 */
export type ExternalsTypeLiteral =
	| "var"
	| "module"
	| "assign"
	| "this"
	| "window"
	| "self"
	| "global"
	| "commonjs"
	| "commonjs2"
	| "commonjs-module"
	| "commonjs-static"
	| "amd"
	| "amd-require"
	| "umd"
	| "umd2"
	| "jsonp"
	| "system"
	| "promise"
	| "import"
	| "module-import"
	| "script"
	| "node-commonjs";
/**
 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
 */
export type Remotes = (RemotesItem | RemotesObject)[] | RemotesObject;
/**
 * Container location from which modules should be resolved and loaded at runtime.
 */
export type RemotesItem = string;
/**
 * Container locations from which modules should be resolved and loaded at runtime.
 */
export type RemotesItems = RemotesItem[];
/**
 * Specifies the category of externals.
 */
export type ExternalsCategory =
	| "amd"
	| "commonjs"
	| "static-import"
	| "dynamic-import";

export interface ContainerReferencePluginOptions {
	/**
	 * The external type of the remote containers.
	 */
	remoteType: ExternalsType;
	/**
	 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
	 */
	remotes: Remotes;
	/**
	 * The name of the share scope shared with all remotes (defaults to 'default').
	 */
	shareScope?: string;
}
/**
 * Container locations from which modules should be resolved and loaded at runtime. Property names are used as request scopes.
 */
export interface RemotesObject {
	/**
	 * Container locations from which modules should be resolved and loaded at runtime.
	 */
	[k: string]: RemotesConfig | RemotesItem | RemotesItems;
}
/**
 * Advanced configuration for container locations from which modules should be resolved and loaded at runtime.
 */
export interface RemotesConfig {
	/**
	 * Container locations from which modules should be resolved and loaded at runtime.
	 */
	external: RemotesItem | RemotesItems;
	/**
	 * The name of the share scope shared with this remote.
	 */
	shareScope?: string;
}
