<?php
declare(strict_types=1);

$root = dirname(__DIR__);
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root));
$failed = false;

foreach ($iterator as $file) {
    if (!$file->isFile() || $file->getExtension() !== 'php') {
        continue;
    }
    if (str_contains($file->getPathname(), DIRECTORY_SEPARATOR . 'node_modules' . DIRECTORY_SEPARATOR)) {
        continue;
    }
    $command = sprintf('php -l %s', escapeshellarg($file->getPathname()));
    exec($command, $output, $status);
    if ($status !== 0) {
        fwrite(STDERR, implode(PHP_EOL, $output) . PHP_EOL);
        $failed = true;
    }
    $output = [];
}

exit($failed ? 1 : 0);
