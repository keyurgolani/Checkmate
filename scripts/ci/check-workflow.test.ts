import { beforeEach, describe, expect, it } from 'vitest';
import { checkPublishCondition, checkWorkflows, loadWorkflowTree, publishPolicy } from './check-workflow.mjs';

// Each test plants one violation into a copy of the repository's own workflows.
type Tree = ReturnType<typeof loadWorkflowTree>;
let tree: Tree;

beforeEach(() => {
  tree = structuredClone(loadWorkflowTree());
});

const ci = () => tree.workflows['ci.yml'];
const called = () => tree.workflows['publish-images.yml'];
const problems = () => checkWorkflows(tree);

describe('check-workflow', () => {
  it('passes the repository workflows', () => {
    expect(problems()).toEqual([]);
  });

  it('flags an action pinned to a tag instead of a commit', () => {
    ci().jobs.lint.steps[0].uses = 'actions/checkout@v7';
    expect(problems()).toContain('ci.yml: actions/checkout@v7 must pin a full commit SHA');
  });

  it('flags a docker:// step without a digest', () => {
    ci().jobs.images.steps.push({ uses: 'docker://alpine:3.20' });
    expect(problems()).toContain('ci.yml: docker://alpine:3.20 must pin an image digest (@sha256:...)');
  });

  it('flags a secret in a pull request job', () => {
    ci().jobs.unit.steps.push({ run: 'echo "$TOKEN"', env: { TOKEN: '${{ secrets.DOCKERHUB_TOKEN }}' } });
    expect(problems()).toContain("ci.yml: job unit reads secrets; only ci.yml's publish job and the job it calls may");
  });

  it('flags a write permission outside publish', () => {
    ci().jobs.build.permissions = { contents: 'write' };
    expect(problems()).toContain("ci.yml: job build has write permissions; only ci.yml's publish job and the job it calls may");
  });

  it('flags a writable or missing top-level token', () => {
    ci().permissions = 'write-all';
    delete called().permissions;
    expect(problems()).toEqual(
      expect.arrayContaining(['ci.yml: top-level permissions must be read-only', 'publish-images.yml: set top-level permissions, read-only']),
    );
  });

  it('flags secrets in workflow-level env', () => {
    ci().env.HUB_USER = '${{ secrets.DOCKERHUB_USERNAME }}';
    expect(problems()).toContain('ci.yml: workflow-level env must not read secrets');
  });

  it('flags a publish condition that drops the PUBLISH_FROM_NEXT gate', () => {
    ci().jobs.publish.if =
      "${{ !cancelled() && needs.aggregate.result == 'success' && github.event_name == 'push' && (startsWith(github.ref, 'refs/tags/v') || github.ref == 'refs/heads/next') }}";
    expect(problems()).toContain(
      "ci.yml: publish runs on a push of refs/heads/next with PUBLISH_FROM_NEXT unset and aggregate success, where it must skip",
    );
  });

  it('flags publishing from main', () => {
    ci().jobs.publish.if = "${{ needs.aggregate.result == 'success' && github.event_name == 'push' }}";
    expect(problems().join('\n')).toContain('publish runs on a push of refs/heads/main');
  });

  it('flags publishing from a pull request', () => {
    ci().jobs.publish.if =
      "${{ needs.aggregate.result == 'success' && (startsWith(github.ref, 'refs/tags/v') || (github.ref == 'refs/heads/next' && vars.PUBLISH_FROM_NEXT == 'true')) }}";
    expect(problems().join('\n')).toContain('publish runs on a pull_request of ');
  });

  it('flags publishing after a failed aggregate', () => {
    // A status function replaces the implicit success() check, so this ignores the aggregate result.
    ci().jobs.publish.if =
      "${{ !cancelled() && github.event_name == 'push' && (startsWith(github.ref, 'refs/tags/v') || (github.ref == 'refs/heads/next' && vars.PUBLISH_FROM_NEXT == 'true')) }}";
    expect(problems()).toContain(
      "ci.yml: publish runs on a push of refs/heads/next with PUBLISH_FROM_NEXT 'true' and aggregate failure, where it must skip",
    );
  });

  it('flags publishing in a cancelled run', () => {
    ci().jobs.publish.if =
      "${{ always() && needs.aggregate.result == 'success' && github.event_name == 'push' && (startsWith(github.ref, 'refs/tags/v') || (github.ref == 'refs/heads/next' && vars.PUBLISH_FROM_NEXT == 'true')) }}";
    expect(problems().join('\n')).toContain('and aggregate success in a cancelled run, where it must skip');
  });

  it('accepts an equivalent rewrite of the publish condition', () => {
    ci().jobs.publish.if =
      "github.event_name == 'push' && (github.ref_type == 'tag' && startsWith(github.ref_name, 'v') || github.ref_name == 'next' && vars.PUBLISH_FROM_NEXT == 'true')";
    expect(problems()).toEqual([]);
  });

  it('flags publish without aggregate, or with inherited secrets', () => {
    ci().jobs.publish.needs = ['checks'];
    ci().jobs.publish.secrets = 'inherit';
    expect(problems()).toEqual(
      expect.arrayContaining(['ci.yml: publish must need aggregate', 'ci.yml: publish must pass secrets by name, not inherit them']),
    );
  });

  it('flags a publishing job without the release environment', () => {
    delete called().jobs.publish.environment;
    expect(problems()).toContain('publish-images.yml: job publish must declare environment: release');
  });

  it('flags a guard in the publishing workflow that is looser than the policy', () => {
    called().jobs.publish.if = "${{ github.event_name == 'push' }}";
    expect(problems().join('\n')).toContain('publish-images.yml: job publish runs on a push of refs/heads/main');
  });

  it('flags a publishing workflow with a trigger of its own', () => {
    called().on.push = { branches: ['main'] };
    expect(problems()).toContain('publish-images.yml must trigger only on workflow_call');
  });

  it.each(['pull_request_target', 'workflow_dispatch'])('flags the %s trigger', (event) => {
    ci().on[event] = null;
    expect(problems()).toContain(`ci.yml: the ${event} trigger is not allowed; ci.yml runs on pull_request and push only`);
  });

  it('flags a path filter, which would leave aggregate pending', () => {
    ci().on.pull_request.paths = ['src/**'];
    expect(problems()).toContain('ci.yml: on.pull_request.paths would leave the aggregate check pending; scope.mjs classifies paths instead');
  });

  it('flags a job missing from aggregate needs, and an aggregate that can be skipped', () => {
    ci().jobs.aggregate.needs = ci().jobs.aggregate.needs.filter((job: string) => job !== 'backend');
    ci().jobs.aggregate.if = '${{ !cancelled() }}';
    expect(problems()).toEqual(
      expect.arrayContaining(['ci.yml: aggregate must need backend', 'ci.yml: aggregate must run with if: always()']),
    );
  });

  it('flags a job that .github/ci-scope.json does not describe', () => {
    ci().jobs.security = { 'runs-on': 'ubuntu-latest', steps: [{ run: 'true' }] };
    ci().jobs.aggregate.needs.push('security');
    expect(problems()).toEqual(['.github/ci-scope.json has no entry for the security job']);
  });
});

describe('publish condition', () => {
  it.each([
    [{ event: 'push', ref: 'refs/tags/v0.3.0', publishFromNext: undefined }, true],
    [{ event: 'push', ref: 'refs/tags/v0.2.1', publishFromNext: undefined }, true],
    [{ event: 'push', ref: 'refs/heads/next', publishFromNext: 'true' }, true],
    [{ event: 'push', ref: 'refs/heads/next', publishFromNext: undefined }, false],
    [{ event: 'push', ref: 'refs/heads/main', publishFromNext: 'true' }, false],
    [{ event: 'pull_request', ref: 'refs/pull/7/merge', publishFromNext: 'true' }, false],
  ])('policy for %o is %s', (scenario, expected) => {
    expect(publishPolicy({ ...scenario, aggregate: 'success', cancelled: false })).toBe(expected);
    expect(publishPolicy({ ...scenario, aggregate: 'failure', cancelled: false })).toBe(false);
  });

  it("reports a condition it can't evaluate", () => {
    expect(checkPublishCondition("github.ref =~ 'refs/tags/'")).toMatch(/can't evaluate/);
  });
});
