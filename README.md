# Rave Board hold-size experiment

This branch hosts the disposable comparison lab. The production application, current sender, and project documentation are on **[main](https://github.com/sleechie/rave-board)**.

[Open the lab](https://raveboard-hold-lab.up.railway.app/) · [Experiment notes](experiments/hold-sizes/README.md)

With Node.js 24 or newer:

```sh
cd experiments/hold-sizes
npm start
```

Open http://localhost:8080. Run `npm test` from the same directory. No dependency installation is required.

The lab has its own deployment, origin, assets and frozen baseline. It is not the current production Bluetooth sender and should not be merged wholesale into `main`.

Original code is available under the [MIT License](LICENSE). Retain the experiment's bundled third-party licenses and hold-data provenance. Third-party artwork and trademarks are not covered by the MIT grant.
