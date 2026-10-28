# Pane contract mechanisms

These details accompany the behavioral requirements; status and acceptance are in CONTRACT.md.

## Presentation

The fuchsia theme uses `--pn-fuchsia: #f5026f` and `--pn-action: #e8176e`, with self-hosted Figtree. Shared entry documents deny camera, microphone and geolocation.

## Search normalization

Effective metadata includes site defaults and compares after Unicode NFKC normalization, whitespace folding and en-US lowercasing.

## Public goal event

Custom code subscribes to the `pane:goal` browser event with goal name and value. It follows the consent and isolation rules of the page holding it.

## Capacity and custody

The current typed bounds and recovery procedure are documented in [forms](../FORMS-AND-ACCESS.md), [move-in](../MOVE-IN.md), [custom code](../CUSTOM-CODE.md) and [backup and restore](../BACKUP-RESTORE.md). They bound request rate, serialized draft size and individual media size; no fixed daily business quota is introduced by this rewrite.
