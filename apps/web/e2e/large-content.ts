import { LargeContentFixture } from '../../api/test/support/LargeContentFixture'

/** Prints the directory of a freshly generated synthetic 10,000-word content set. */
process.stdout.write(LargeContentFixture.create())
