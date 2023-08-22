import cp from 'child_process'
import fs from 'fs/promises'
import path from 'path'

import type IPackageJson from '@ts-type/package-dts'
import { Command } from 'commander'
import logger from 'node-color-log'

logger.setDate(() => '')

const cliName = 'bump'

const semverRegex = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/

const processDir = path.resolve()
const packageJsonPath = path.resolve(processDir, 'package.json')
const changelogPath = path.resolve(processDir, 'CHANGELOG.md')
const yarnVersionsPath = path.resolve(processDir, '.yarn/versions')

const execCommandSync = (file: string, args: string[]) => {
  try {
    // eslint-disable-next-line no-sync
    cp.execFileSync(file, args, { stdio: 'inherit' })
  } catch { /* no-op */ }
}


interface Context {
  version: string
}

const ctx: Context = { version: '' }

function getArgs() {
  const program = new Command()

  program
    .name(cliName)
    .description('Bump package version')
    .argument('<version>', 'Next version')
    .action((version: string) => { ctx.version = version })
    .parse()
}

async function getPackageJson(): Promise<IPackageJson> {
  let rawPackageJson: string
  try {
    rawPackageJson = await fs.readFile(packageJsonPath, 'utf-8')
  } catch (_) {
    throw new Error(`No package.json fount at ${processDir}`)
  }

  return JSON.parse(rawPackageJson) as IPackageJson
}

function resolveNextVersion(input: string, { version: currVersion }: IPackageJson): string {
  const isSemverHint = ['major', 'minor', 'patch'].includes(input)
  if (!isSemverHint) { return input }

  if (!currVersion?.match(semverRegex)) {
    throw new Error('Version in package.json is not SemVer compliant')
  }

  return currVersion
}

async function updateChangelog(version: string) {
  let rawChangelog: string
  try {
    rawChangelog = await fs.readFile(changelogPath, 'utf-8')
  } catch (_) {
    logger.warn(`No CHANGELOG found at ${changelogPath}, skipping...`)
    return
  }

  const lines = rawChangelog.toString().split(/(?:\r\n|\r|\n)/g)

  const unreleasedLine = lines.findIndex((line) =>
    line
      .trim()
      .replace(/\s/g, '')
      .toLowerCase()
      .match(/^## Unreleased/)
  )

  if (unreleasedLine === -1) { return }

  const date = new Date().toISOString()
  const tIndex = date.indexOf('T')

  const output = lines
    .slice(0, unreleasedLine + 1)
    .concat('')
    .concat(`## [${version}] - ${date.slice(0, tIndex)}`)
    .concat('')
    .concat(lines.slice(unreleasedLine + 2))

  await fs.writeFile(changelogPath, output.join('\n'))
}

function commitAndTag(version: string, { name }: IPackageJson) {
  const tag = `v${version}`
  const message = `${name ?? ''} tagged at version ${version}`

  const filesToCommit = [packageJsonPath, changelogPath, yarnVersionsPath]

  execCommandSync('git', ['reset'])
  execCommandSync('git', ['add', ...filesToCommit])
  execCommandSync('git', ['commit', '-nm', message])
  execCommandSync('git', ['tag', '-a', tag, '-m', message])

  logger.log('\n')
  logger.success(`Push both branch and tag:`)
  logger.bold().log(`\tgit push && git push origin ${tag}`)
}

async function main() {
  getArgs()

  execCommandSync('yarn', ['version', ctx.version])

  const packageJson = await getPackageJson()

  const nextVersion = resolveNextVersion(ctx.version, packageJson)

  await updateChangelog(nextVersion)
  commitAndTag(nextVersion, packageJson)
}

main()
  .catch((err: unknown) => logger.error(`[${cliName}] ${err instanceof Error ? err.message : 'Error during bump'}`))
