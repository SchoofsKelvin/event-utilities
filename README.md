# Utils action
This action calculates several handy fields to use in other jobs.

## Inputs

### `artifact_prefix`
**Optional** The prefix that `formatted_name` should start with.
By default there is no prefix. If a prefix is given, a trailing dash will be added if missing.
E.g. both `"test"` and `"test-"` will result in `formatted_name` starting with `"test-"`

### `artifact_extension`
**Optional** The extension that `formatted_name` should end with.
By default, there is no extension. Similar to `artifact_prefix`, a leading dot is automatically added.
E.g. both `"txt"` and `".txt"` will result in `formatted_name` ending with `".txt"`

### `append_sha`
**Optional** Whether to make sure the first 8 characters of the commit SHA are included in `formatted_name`.
This will make sure the `formatted_name` will end with e.g. `-ab1cd3ef`.
See the section about `formatted_name` on the specific logic of this.

## Outputs

### `formatted_name`
A nicely formatted name based on the `ref` and `sha` in the current workflow context.
_`ref` is for example `refs/tags/v1.0.0` when this workflow run is for pushing the `v1.0.0` tag, while `refs/heads/wip/stuff` would be for the  `wip/stuff` branch._
The algorithm looks more or less like this:
- Calculate the base name
    - If `ref` represents a semver tag _(starts with `vX.Y.Z` where X/Y/Z are numbers)_:
    => Use the tag name without the leading `v`, e.g. `1.0.0` for `v1.0.0`
    - If `ref` represents another tag, use the _(whole)_ tag name
    - If `ref` represents a branch, use the branch name, e.g. `wip/stuff`
    - If `ref` represents a pull request, use `pr-123` with the correct number
    - Any other `ref` should never be pushed, but if so:
    => If it starts with `refs/`, use everything after the `/`
    - Otherwise use the first 8 characters of the commit SHA
- Include commit SHA if `append_sha` is set
    - In case the base name already is the first 8 characters, do nothing
    - Otherwise, append e.g. `-ab1cd3ef` to the base name
- Convert all slashes (`/`) to dashes (`-`), e.g. `wip/stuff` becomes `wip-stuff`
- Remove all non-alphanumeric characters apart from dashes/dots/underscores

**Examples**:
- Pushing commit `ab1cd3ef...` to the branch `wip/stuff`:
    - With `append_sha` results in `wip-stuff-ab1cd3ef` otherwise `wip-stuff`
- Pushing commit `ab1cd3ef...` to pull request 123 or merging it:
    - With `append_sha` results in `pr-123-ab1cd3ef` otherwise `pr-123`
- Pushing tag `v1.2.3` pointing at commit `ab1cd3ef...`:
    - With `append_sha` results in `1.2.3-ab1cd3ef` otherwise `1.2.3`
- Pushing tag `verdict` pointing at commit `ab1cd3ef...`:
    - With `append_sha` results in `verdict-ab1cd3ef` otherwise `verdict`

### `artifact_name`
Basically appending everything together into `[artifact_prefix-]formatted_name[.artifact_extension]`.

Missing inputs won't be included. The prefix will have a trailing dash added if missing, while for the extension it's a leading dot.

Example for `formatted_name` being `master`:
- Without `artifact_prefix` and `artifact_extension`:
- With `artifact_prefix` set to `bundled` => `bundled-master`
- With `artifact_prefix` set to `bundled-` => `bundled-master`
- With `artifact_extension` set to `js` => `master.js`
- With `artifact_extension` set to `.js` => `master.js`
- With prefix/extension set to `bundled-`/`js` => `bundled-master.js`
- With prefix/extension set to `bundled`/`.js` => `bundled-master.js`

### `tag_version`
If this push is for a semver tag (e.g. `vX.Y.Z`), this will be set to `X.Y.Z`.

For example, pushing the tag `v1.2.3` results in `tag_version` being `1.2.3`.

### `pr_number`
If this push is towards a pull request, this will be set to its number.

## Example usage

uses: actions/hello-world-javascript-action@v1.1
with:
  who-to-greet: 'Mona the Octocat'

```yml
- name: Run utilities
  id: utils
  uses: SchoofsKelvin/event-utilities@v1
  with:
    artifact_prefix: "my-extension"
    artifact_extension: "vsix"
    append_sha: true
- name: Build extension
  run: vsce package -o ${{ steps.utils.outputs.artifact_name }}
- name: Upload a Build Artifact
  uses: actions/upload-artifact@v2.2.1
  with:
    name: ${{ steps.utils.outputs.artifact_name }}
    path: ${{ steps.utils.outputs.artifact_name }}
    if-no-files-found: error
```
Pushing commit `ab1cd3ef...` to the branch `master` would result in the workflow run having an artifact named `my-extension-master-ab1cd3ef.vsix`.
