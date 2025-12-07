if (process.env.EASYQUANT_LAUNCHER !== '1') {
  console.error('\n' + '!'.repeat(60));
  console.error('ERROR: Direct execution prohibited.');
  console.error('Please use the management script to start the application:');
  console.error('  python manage.py start');
  console.error('!'.repeat(60) + '\n');
  process.exit(1);
}

