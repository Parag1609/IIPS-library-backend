import mongoose from 'mongoose';
import Member from '../models/LibraryCard.js';
import Book from '../models/Book.js';

/**
 * One-time script to clean up orphaned book references
 * Run this to fix existing inconsistencies
 */
async function cleanupOrphanedReferences() {
  try {
    console.log('Starting cleanup of orphaned book references...');

    // Get all members with issued books
    const members = await Member.find({ 
      issuedBooks: { $exists: true, $ne: [] } 
    });

    console.log(`Found ${members.length} members with issued books`);

    let totalOrphaned = 0;
    let membersFixed = 0;

    for (const member of members) {
      const validIssuedBooks = [];
      const orphanedBooks = [];

      for (const issuedBook of member.issuedBooks) {
        // Check if the book still exists
        const bookExists = await Book.findById(issuedBook.book);
        
        if (bookExists) {
          validIssuedBooks.push(issuedBook);
        } else {
          orphanedBooks.push(issuedBook);
          totalOrphaned++;
        }
      }

      // Update member if orphaned references were found
      if (orphanedBooks.length > 0) {
        console.log(`Member ${member.name} (${member.email}): Removing ${orphanedBooks.length} orphaned book(s)`);
        
        member.issuedBooks = validIssuedBooks;
        await member.save();
        membersFixed++;
      }
    }

    console.log('\n=== Cleanup Summary ===');
    console.log(`Total members checked: ${members.length}`);
    console.log(`Members with orphaned references: ${membersFixed}`);
    console.log(`Total orphaned references removed: ${totalOrphaned}`);
    console.log('Cleanup completed successfully!');

  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

export default cleanupOrphanedReferences;