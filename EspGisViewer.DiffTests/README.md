# Diff Tests

1) Run the `esp-gis-server` project on port `3000`.
2) Run this project on port `62836`.
3) Right click on the `EspGisViewer.DiffTests` project and select `Run Tests`.

## Frontend tests with dotnet test

Running `dotnet test` from this project directory also runs `yarn test` in
`../EspGisViewer/Client` before the .NET test target. This also applies when
the project is tested through the solution, including with `--no-build`.
Frontend test failures fail the overall command.

Node.js and Yarn must be on PATH, and the frontend dependencies must already
be installed with `yarn install` in the client directory. Normal builds do
not run the frontend tests.

This hook does not change .NET test discovery. The legacy project currently
lacks CLI test-project/adapter configuration, so `dotnet test` skips the .NET
tests themselves; use the Visual Studio test runner described above for those.