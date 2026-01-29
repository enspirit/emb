/**
 * Resolves the Kubernetes namespace to use for operations.
 *
 * Resolution order (first non-empty value wins):
 * 1. CLI flag (--namespace)
 * 2. Environment variable (K8S_NAMESPACE)
 * 3. Config file (kubernetes.namespace in .emb.yml)
 * 4. Default: "default"
 */
export function resolveNamespace(options: {
  cliFlag?: string;
  config?: string;
}): string {
  return (
    options.cliFlag || process.env.K8S_NAMESPACE || options.config || 'default'
  );
}
