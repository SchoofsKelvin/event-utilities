
import * as core from '@actions/core';
import * as github from '@actions/github';

const SEMVER_REGEX = /^v(\d+\.\d+\.\d+.*)$/;

function setOutput(key: string, value: any) {
    core.info(`Setting output ${key} to: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
    core.setOutput(key, value);
}

async function run() {
    let artifact_prefix = core.getInput('artifact_prefix');
    if (artifact_prefix && !artifact_prefix.endsWith('-')) {
        artifact_prefix += '-';
    }

    let artifact_extension = core.getInput('artifact_extension');
    if (artifact_extension && !artifact_extension.startsWith('.')) {
        artifact_extension = `.${artifact_extension}`;
    }

    const append_sha = core.getInput('append_sha').toLowerCase();
    const need_sha = append_sha === 'true' || append_sha === 'yes';

    const { ref, sha } = github.context;
    const short_sha = sha.substring(0, 8);
    let formatted_name: string;
    const tag_name = ref.startsWith('refs/tags/') && ref.substring(10);
    if (tag_name) {
        const [, tag_version] = tag_name.match(SEMVER_REGEX) || [];
        if (tag_version) {
            setOutput('tag_version', tag_version);
            formatted_name = tag_version;
        } else {
            formatted_name = tag_name;
        }
    } else if (ref.startsWith('refs/pull/')) {
        const match = ref.match(/^refs\/pull\/(\d+)\/.*/);
        if (match) {
            const pr_number = parseInt(match[1]);
            setOutput('pr_number', pr_number);
            formatted_name = `pr-${pr_number}`;
        } else {
            core.warning(`Got '${ref}' as ref, which looks PR-like but isn't. Treating as a weird branch name`);
            formatted_name = ref.substring(5);
        }
    } else if (ref.startsWith('refs/heads/')) {
        formatted_name = ref.substring(11);
    } else if (ref.startsWith('refs/')) {
        formatted_name = ref.substring(5);
    } else {
        formatted_name = short_sha;
    }

    if (need_sha && formatted_name !== short_sha) {
        formatted_name += `-${short_sha}`;
    }

    formatted_name = formatted_name.replace(/\//g, '-').replace(/[^\w\.\-]/g, '');
    setOutput('formatted_name', formatted_name);

    const artifact_name = `${artifact_prefix}${formatted_name}${artifact_extension}`;
    setOutput('artifact_name', artifact_name);
}

if (require.main === module) {
    core.info('Running on-push-utils-action');
    run().catch(err => {
        core.setFailed(err);
        process.exit(core.ExitCode.Failure);
    });
}

module.exports = { run };
